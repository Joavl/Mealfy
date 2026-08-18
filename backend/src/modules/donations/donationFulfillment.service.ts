import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { wasFedThisCycle, getCurrentCycleStart } from '../../shared/utils/feedCycle';
import { createAuditLog } from '../auditLogs/auditLog.service';
import { encryptGiftCardCode, maskGiftCardCode, hashGiftCardCode } from '../../shared/crypto/crypto.service';
import { resolveGiftCardProvider, resolveGiftCardProviderName } from '../giftCards/providers';
import type { IssuedGiftCard, PurchaseGiftCardOutput } from '../giftCards/providers';
import * as giftCardOrders from '../giftCards/giftCardOrders.service';
import type { Donation, Family, GiftCardOrder, Prisma } from '@prisma/client';

type FamilyLite = { id: string; displayName: string; city: string; state: string };
const familySelect = { id: true, displayName: true, city: true, state: true } as const;

const toFamilyLite = (f: Family): FamilyLite => ({
  id: f.id,
  displayName: f.displayName,
  city: f.city,
  state: f.state,
});

export interface FulfillmentResult {
  donation: Donation;
  family: FamilyLite | null;
  outcome:
    | 'completed'
    | 'manual_review'
    | 'already_completed'
    | 'noop_in_progress'
    /** Fornecedor aceitou o pedido mas ainda não emitiu o código (emissão assíncrona). */
    | 'purchase_pending';
}

/** Encripta code/pin antes de persistir a resposta do provider — nunca texto puro em nenhuma coluna. */
function redactPurchase(purchase: IssuedGiftCard): Prisma.InputJsonValue {
  return {
    externalOrderId: purchase.externalOrderId,
    provider: purchase.provider,
    brand: purchase.brand,
    amount: purchase.amount,
    currency: purchase.currency,
    code: encryptGiftCardCode(purchase.code),
    pin: purchase.pin ? encryptGiftCardCode(purchase.pin) : null,
    expiresAt: purchase.expiresAt ? purchase.expiresAt.toISOString() : null,
    redeemUrl: purchase.redeemUrl ?? null,
    instructions: purchase.instructions ?? null,
  };
}

async function createGiftCardFromPurchase(
  tx: Prisma.TransactionClient,
  purchase: IssuedGiftCard,
  donationId: string,
  familyId: string,
): Promise<string> {
  const giftCard = await tx.giftCard.create({
    data: {
      provider: purchase.provider,
      codeEncrypted: encryptGiftCardCode(purchase.code),
      codeMasked: maskGiftCardCode(purchase.code),
      codeHash: hashGiftCardCode(purchase.code),
      amount: purchase.amount,
      status: 'used',
      usedAt: new Date(),
      batchId: null,
      donationId,
      familyId,
      expiresAt: purchase.expiresAt ?? null,
    },
  });
  return giftCard.id;
}

async function finishAsManualReview(
  donation: Donation,
  family: Family,
  failureReason: string,
  actorUserId?: string | null,
  orderId?: string,
): Promise<FulfillmentResult> {
  const updated = await prisma.donation.update({
    where: { id: donation.id },
    data: { status: 'manual_review', failureReason },
  });
  await createAuditLog({
    actorUserId: actorUserId ?? null,
    action: 'donation_manual_review',
    entityType: 'donation',
    entityId: donation.id,
    metadata: { failureReason, giftCardOrderId: orderId ?? null },
  });
  return { donation: updated, family: toFamilyLite(family), outcome: 'manual_review' };
}

/**
 * Orquestra a emissão do gift card depois que o Pix foi confirmado. Chamado
 * pelo webhook de pagamento e por `confirmDonationPaymentMock` — nunca pelo
 * front. Regra crítica: nunca chama o provider antes do pagamento confirmado
 * (a doação só chega aqui depois de `pending_payment`); nunca marca família
 * alimentada sem um código de verdade emitido.
 *
 * `isRetry: true` é a única forma de reprocessar uma doação em `manual_review`
 * (via endpoint admin) — webhook duplicado nunca reabre uma doação escalada.
 */
export async function fulfillPaidDonation(
  donationId: string,
  actorUserId?: string | null,
  options?: { isRetry?: boolean },
): Promise<FulfillmentResult> {
  const donation = await prisma.donation.findUnique({ where: { id: donationId } });
  if (!donation) throw new AppError('Doação não encontrada', 404, 'donation_not_found');

  if (donation.status === 'completed') {
    const family = await prisma.family.findUnique({ where: { id: donation.familyId }, select: familySelect });
    return { donation, family, outcome: 'already_completed' };
  }
  if (donation.status === 'gift_card_purchase_pending') {
    const family = await prisma.family.findUnique({ where: { id: donation.familyId }, select: familySelect });
    return { donation, family, outcome: 'noop_in_progress' };
  }
  if (donation.status === 'manual_review' && !options?.isRetry) {
    const family = await prisma.family.findUnique({ where: { id: donation.familyId }, select: familySelect });
    return { donation, family, outcome: 'noop_in_progress' };
  }
  if (donation.status !== 'pending_payment' && donation.status !== 'manual_review') {
    throw new AppError(`Doação em estado inválido para fulfillment (${donation.status}).`, 409, 'invalid_state');
  }

  // O Pix foi confirmado pelo chamador (webhook ou confirm-payment-mock) antes
  // de chegar aqui — isso é um fato independente do resultado da emissão do
  // gift card. Marca o pagamento como pago já agora, pra continuar `paid`
  // mesmo se a emissão cair em `manual_review` mais adiante.
  if (donation.paymentId) {
    await prisma.payment.update({
      where: { id: donation.paymentId },
      data: { status: 'paid', paidAt: new Date() },
    });
  }

  const family = await prisma.family.findUnique({ where: { id: donation.familyId } });
  if (!family) throw new AppError('Família não encontrada', 404, 'family_not_found');

  // Pré-check barato: evita comprar pra uma família já alimentada (cobre a
  // maioria dos casos de corrida sem gastar nada). A claim de verdade é
  // atômica e acontece depois da compra, em T2 — nunca confiamos só nisto.
  if (wasFedThisCycle(family.lastFedAt)) {
    return finishAsManualReview(donation, family, 'already_fed_today', actorUserId);
  }

  // T1: marca em andamento (transição rápida e atômica).
  const inFlight = await prisma.donation.update({
    where: { id: donationId },
    data: { status: 'gift_card_purchase_pending' },
  });

  // O fornecedor é resolvido pela MARCA do cartão — cada marca pode estar em um
  // fornecedor diferente (ex.: iFood por API, Carrefour em estoque manual).
  const provider = resolveGiftCardProvider(donation.provider);

  const idempotencyKey = options?.isRetry ? `${donationId}:retry:${Date.now()}` : donationId;
  const order = await giftCardOrders.createProcessingOrder({
    donationId,
    familyId: family.id,
    provider: donation.provider,
    externalProvider: provider.name,
    idempotencyKey,
    amount: donation.amount,
    currency: 'BRL',
  });

  // Fora de transação: chamada ao provider (hoje síncrona/local — manual_inventory;
  // pode ser uma chamada HTTP lenta/instável no futuro, daí o desenho em 2 fases).
  let purchase: PurchaseGiftCardOutput;
  try {
    purchase = await provider.purchaseGiftCard({
      provider: donation.provider,
      amount: donation.amount,
      currency: 'BRL',
      donationId,
      familyId: family.id,
      idempotencyKey,
    });
  } catch (err) {
    const failureReason = err instanceof AppError ? err.code ?? err.message : 'unknown_error';
    const rawResponseMetadata =
      err instanceof AppError ? { message: err.message, code: err.code } : { message: String(err) };
    await giftCardOrders.markOrderManualReview(order.id, failureReason, rawResponseMetadata);
    return finishAsManualReview(inFlight, family, failureReason, actorUserId, order.id);
  }

  // Fornecedor assíncrono: pedido aceito, código ainda não emitido. A doação
  // FICA em `gift_card_purchase_pending` e a família NÃO é marcada como
  // alimentada — não há código para entregar. Quem conclui é a reconciliação,
  // via `completePendingOrder`.
  if (purchase.status === 'pending') {
    await giftCardOrders.markOrderAwaitingSupplier(order.id, purchase.externalOrderId, {
      externalOrderId: purchase.externalOrderId,
      provider: purchase.provider,
      amount: purchase.amount,
      currency: purchase.currency,
    });
    return { donation: inFlight, family: toFamilyLite(family), outcome: 'purchase_pending' };
  }

  return claimAndIssue(inFlight, family, purchase, order.id, actorUserId);
}

/**
 * T2 — claim atômico da família + criação/vínculo do gift card + conclusão.
 * Só é chamada com um código REAL em mãos (`IssuedGiftCard`), seja do caminho
 * síncrono ou da conclusão de um pedido assíncrono. É aqui que a garantia de
 * "uma família alimentada por ciclo" é aplicada, no próprio UPDATE condicional.
 */
async function claimAndIssue(
  donation: Donation,
  family: Family,
  issued: IssuedGiftCard,
  orderId: string,
  actorUserId?: string | null,
): Promise<FulfillmentResult> {
  const donationId = donation.id;
  const cycleStart = getCurrentCycleStart();
  const donor = await prisma.user.findUnique({
    where: { id: donation.donorId },
    select: { name: true, instagram: true },
  });

  let result: { lostRace: true } | { lostRace: false; donation: Donation; giftCardId: string };
  try {
    result = await prisma.$transaction(async (tx) => {
      const fed = await tx.$queryRaw<Array<{ id: string }>>`
        UPDATE "families" SET "lastFedAt" = now(), "supportStatus" = 'fed',
          "lastDonationId" = ${donationId}, "lastDonorId" = ${donation.donorId},
          "lastDonorName" = ${donor?.name ?? null}, "lastDonorInstagram" = ${donor?.instagram ?? null},
          "lastGiftCardProvider" = ${donation.provider}::"GiftCardProvider", "updatedAt" = now()
        WHERE "id" = ${family.id} AND ("lastFedAt" IS NULL OR "lastFedAt" < ${cycleStart})
        RETURNING "id";`;
      if (fed.length === 0) {
        return { lostRace: true as const };
      }

      const giftCardId =
        issued.existingGiftCardId ?? (await createGiftCardFromPurchase(tx, issued, donationId, family.id));

      const updatedDonation = await tx.donation.update({
        where: { id: donationId },
        data: { status: 'completed', giftCardId, completedAt: new Date() },
      });
      // payment já foi marcado 'paid' no início do fulfillment (independente do resultado da emissão).
      await tx.giftCardEvent.create({ data: { giftCardId, eventType: 'released', donationId } });
      return { lostRace: false as const, donation: updatedDonation, giftCardId };
    });
  } catch (err) {
    // Já compramos/reclamamos o código — preserva a resposta (cifrada) e escala
    // pra revisão manual em vez de perder o que já foi pago/consumido do estoque.
    await giftCardOrders.markOrderManualReview(orderId, 'fulfillment_transaction_error', redactPurchase(issued));
    return finishAsManualReview(donation, family, 'fulfillment_transaction_error', actorUserId, orderId);
  }

  if (result.lostRace) {
    await giftCardOrders.markOrderManualReview(orderId, 'family_fed_by_another_donation', redactPurchase(issued));
    return finishAsManualReview(donation, family, 'family_fed_by_another_donation', actorUserId, orderId);
  }

  await giftCardOrders.markOrderIssued(orderId, {
    externalOrderId: issued.externalOrderId,
    rawResponseMetadata: redactPurchase(issued),
  });

  await createAuditLog({
    actorUserId: actorUserId ?? null,
    action: 'release_gift_card',
    entityType: 'gift_card',
    entityId: result.giftCardId,
    metadata: { donationId, externalProvider: resolveGiftCardProviderName(donation.provider) },
  });

  return { donation: result.donation, family: toFamilyLite(family), outcome: 'completed' };
}

/**
 * Conclui um pedido assíncrono quando o código finalmente chega do fornecedor
 * (webhook do fornecedor ou reconciliação via `fetchIssuedOrder`).
 *
 * Ponto de entrada único para não duplicar as garantias do T2: passa pelo mesmo
 * claim atômico, mesma escalada para `manual_review` e mesma auditoria.
 */
export async function completePendingOrder(
  orderId: string,
  issued: IssuedGiftCard,
  actorUserId?: string | null,
): Promise<FulfillmentResult> {
  const order = await giftCardOrders.getOrderById(orderId);
  assertOrderIsAwaitingIssue(order);

  const donation = await prisma.donation.findUnique({ where: { id: order.donationId } });
  if (!donation) throw new AppError('Doação não encontrada', 404, 'donation_not_found');

  if (donation.status === 'completed') {
    const family = await prisma.family.findUnique({ where: { id: donation.familyId }, select: familySelect });
    return { donation, family, outcome: 'already_completed' };
  }
  if (donation.status !== 'gift_card_purchase_pending') {
    throw new AppError(
      `Doação em estado inválido para concluir emissão (${donation.status}).`,
      409,
      'invalid_state',
    );
  }

  const family = await prisma.family.findUnique({ where: { id: donation.familyId } });
  if (!family) throw new AppError('Família não encontrada', 404, 'family_not_found');

  return claimAndIssue(donation, family, issued, order.id, actorUserId);
}

function assertOrderIsAwaitingIssue(order: GiftCardOrder): void {
  if (order.status === 'issued') {
    throw new AppError('Pedido já emitido.', 409, 'order_already_issued');
  }
  if (order.status === 'canceled') {
    throw new AppError('Pedido cancelado.', 409, 'order_canceled');
  }
}

/** Reprocessa uma doação em `manual_review` (admin) — sempre cria uma nova tentativa. */
export async function retryFulfillment(orderId: string, actorUserId: string): Promise<FulfillmentResult> {
  const order = await giftCardOrders.getOrderById(orderId);
  return fulfillPaidDonation(order.donationId, actorUserId, { isRetry: true });
}
