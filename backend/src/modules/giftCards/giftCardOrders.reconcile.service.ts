import { prisma } from '../../database/prisma';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import { emitAlert } from '../../shared/alerts/alert.service';
import { createAuditLog } from '../auditLogs/auditLog.service';
import { decryptGiftCardCode } from '../../shared/crypto/crypto.service';
import { resolveGiftCardProvider } from './providers';
import type { IssuedGiftCard } from './providers';
import * as giftCardOrders from './giftCardOrders.service';
import { completePendingOrder } from '../donations/donationFulfillment.service';
import type { GiftCardOrder } from '@prisma/client';

/**
 * Reconciliação de pedidos de gift card presos.
 *
 * Existe porque um pedido em `processing` deixou de ser sempre anomalia: com
 * fornecedor assíncrono é um estado legítimo. Sem isto, um pedido nunca conclui
 * sozinho — **o doador paga e a família não recebe, sem ninguém saber**.
 *
 * Três caminhos de recuperação, do mais barato ao mais caro:
 *  1. Deriva (a doação concluiu mas o pedido não foi marcado): só corrige o pedido.
 *  2. Código já existe do lado de cá (o processo morreu entre reclamar o código
 *     do estoque e concluir): reaproveita o código, não compra de novo.
 *  3. Fornecedor assíncrono: consulta `fetchIssuedOrder` e conclui se emitiu.
 *
 * Se nada resolve e o pedido passou de `GIFT_CARD_ORDER_STALE_MINUTES`, escala
 * para `manual_review` **com alerta** — melhor um humano decidir do que ficar
 * silenciosamente parado.
 *
 * Idempotente e seguro para rodar em paralelo: a conclusão passa pelo mesmo
 * claim atômico de sempre (`completePendingOrder`).
 */

export interface ReconcileOptions {
  /** Sobrescreve o limite de tempo (minutos) só nesta execução. */
  staleMinutes?: number;
  /** Máximo de pedidos por execução — limita a duração de um ciclo. */
  limit?: number;
}

export interface ReconcileSummary {
  scanned: number;
  /** Concluídos agora (código obtido). */
  completed: number;
  /** Pedido corrigido para refletir uma doação que já estava concluída. */
  repaired: number;
  /** Escalados para revisão manual (com alerta). */
  escalated: number;
  /** Ainda dentro da janela — serão vistos na próxima execução. */
  stillPending: number;
  details: Array<{ orderId: string; donationId: string; result: string }>;
}

export async function reconcileStaleOrders(options?: ReconcileOptions): Promise<ReconcileSummary> {
  const staleMinutes = options?.staleMinutes ?? env.GIFT_CARD_ORDER_STALE_MINUTES;
  const limit = options?.limit ?? 100;
  const staleBefore = new Date(Date.now() - staleMinutes * 60_000);

  const orders = await prisma.giftCardOrder.findMany({
    where: { status: { in: ['processing', 'pending'] } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const summary: ReconcileSummary = {
    scanned: orders.length,
    completed: 0,
    repaired: 0,
    escalated: 0,
    stillPending: 0,
    details: [],
  };

  for (const order of orders) {
    const result = await reconcileOne(order, staleBefore);
    summary.details.push({ orderId: order.id, donationId: order.donationId, result });
    if (result === 'completed') summary.completed += 1;
    else if (result === 'repaired') summary.repaired += 1;
    else if (result === 'still_pending') summary.stillPending += 1;
    else summary.escalated += 1;
  }

  return summary;
}

type ReconcileOutcome = 'completed' | 'repaired' | 'still_pending' | 'escalated';

async function reconcileOne(order: GiftCardOrder, staleBefore: Date): Promise<ReconcileOutcome> {
  const donation = await prisma.donation.findUnique({ where: { id: order.donationId } });
  const isStale = order.createdAt < staleBefore;

  // Doação sumiu — pedido não tem como ser concluído.
  if (!donation) {
    return escalate(order, 'donation_not_found', 'gift_card_order_inconsistent', 'critical');
  }

  // (1) Deriva: a doação concluiu mas o pedido ficou para trás (crash entre o
  // commit da transação e a marcação do pedido). Nada a comprar, só corrigir.
  if (donation.status === 'completed') {
    await giftCardOrders.markOrderIssued(order.id, { externalOrderId: order.externalOrderId });
    await createAuditLog({
      action: 'gift_card_order_reconciled',
      entityType: 'gift_card_order',
      entityId: order.id,
      metadata: { donationId: order.donationId, resolution: 'repaired_drift' },
    });
    return 'repaired';
  }

  // Qualquer outro estado que não seja "aguardando emissão" é inconsistência.
  if (donation.status !== 'gift_card_purchase_pending') {
    return escalate(
      order,
      `donation_status_${donation.status}`,
      'gift_card_order_inconsistent',
      'warning',
    );
  }

  // (2) e (3): tenta obter o código.
  let issued: IssuedGiftCard | null = null;
  try {
    issued = await findLocallyClaimedCode(order);
    if (!issued) issued = await fetchFromSupplier(order);
  } catch (err) {
    const reason = err instanceof AppError ? err.code ?? err.message : 'provider_error';
    return escalate(order, `lookup_failed:${reason}`, 'gift_card_order_inconsistent', 'warning');
  }

  if (issued) {
    const result = await completePendingOrder(order.id, issued);
    if (result.outcome === 'completed' || result.outcome === 'already_completed') {
      await createAuditLog({
        action: 'gift_card_order_reconciled',
        entityType: 'gift_card_order',
        entityId: order.id,
        metadata: { donationId: order.donationId, resolution: 'completed_by_reconciliation' },
      });
      return 'completed';
    }
    // completePendingOrder já escalou (ex.: perdeu a corrida do ciclo).
    emitAlert({
      event: 'gift_card_order_manual_review',
      severity: 'warning',
      message: 'Conclusão pela reconciliação terminou em revisão manual.',
      context: { orderId: order.id, donationId: order.donationId, outcome: result.outcome },
    });
    return 'escalated';
  }

  // Ainda sem código: espera se está na janela, escala se passou.
  if (!isStale) return 'still_pending';

  return escalate(order, 'supplier_never_issued', 'gift_card_order_stale', 'critical');
}

/**
 * Recuperação (2): o código já foi reclamado do estoque local mas o processo
 * morreu antes de concluir. O código existe — reaproveita em vez de comprar de
 * novo (compra dupla = prejuízo e estoque furado).
 *
 * Só considera cartões vinculados a esta doação. Em doação com várias tentativas
 * pode haver mais de um; pega o mais recente e deixa os demais para o humano.
 */
async function findLocallyClaimedCode(order: GiftCardOrder): Promise<IssuedGiftCard | null> {
  const card = await prisma.giftCard.findFirst({
    where: { donationId: order.donationId, status: 'used' },
    orderBy: { createdAt: 'desc' },
  });
  if (!card) return null;

  return {
    externalOrderId: order.externalOrderId,
    provider: card.provider,
    brand: card.provider,
    amount: card.amount,
    currency: order.currency,
    code: decryptGiftCardCode(card.codeEncrypted),
    expiresAt: card.expiresAt ?? undefined,
    // Vincula o cartão existente — nunca cria um duplicado.
    existingGiftCardId: card.id,
  };
}

/** Recuperação (3): pergunta ao fornecedor se já emitiu. */
async function fetchFromSupplier(order: GiftCardOrder): Promise<IssuedGiftCard | null> {
  if (!order.externalOrderId) return null;
  const provider = resolveGiftCardProvider(order.provider);
  if (!provider.fetchIssuedOrder) return null;
  return provider.fetchIssuedOrder(order.externalOrderId);
}

async function escalate(
  order: GiftCardOrder,
  failureReason: string,
  event: Parameters<typeof emitAlert>[0]['event'],
  severity: Parameters<typeof emitAlert>[0]['severity'],
): Promise<'escalated'> {
  await giftCardOrders.markOrderManualReview(order.id, failureReason);
  await prisma.donation
    .update({
      where: { id: order.donationId },
      data: { status: 'manual_review', failureReason },
    })
    .catch(() => undefined); // doação pode não existir; o alerta já registra

  await createAuditLog({
    action: 'gift_card_order_escalated',
    entityType: 'gift_card_order',
    entityId: order.id,
    metadata: { donationId: order.donationId, failureReason },
  });

  emitAlert({
    event,
    severity,
    message: `Pedido de gift card escalado para revisão manual: ${failureReason}`,
    context: {
      orderId: order.id,
      donationId: order.donationId,
      brand: order.provider,
      externalProvider: order.externalProvider,
      createdAt: order.createdAt.toISOString(),
      amount: order.amount,
    },
  });

  return 'escalated';
}
