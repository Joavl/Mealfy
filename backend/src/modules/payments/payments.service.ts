import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { env } from '../../config/env';
import { paymentProvider } from './providers';
import { fulfillPaidDonation } from '../donations/donationFulfillment.service';
import { createAuditLog } from '../auditLogs/auditLog.service';
import type { UserRole } from '@prisma/client';
import type { WebhookEvent } from './providers';

/** Cria a cobrança Pix (mock) para uma doação e vincula o pagamento à doação. */
export async function createPixChargeForDonation(donationId: string, amount: number) {
  const charge = await paymentProvider.createPixPayment({
    donationId,
    amount,
    expiresInMinutes: env.PIX_EXPIRATION_MINUTES,
  });
  const payment = await prisma.payment.create({
    data: {
      donationId,
      provider: paymentProvider.name,
      method: 'pix',
      status: 'pending',
      amount,
      pixQrCode: charge.pixQrCode,
      pixCopyPaste: charge.pixCopyPaste,
      externalPaymentId: charge.externalPaymentId,
      expiresAt: charge.expiresAt,
    },
  });
  await prisma.donation.update({ where: { id: donationId }, data: { paymentId: payment.id } });
  return payment;
}

/**
 * Cria a cobrança por CARTÃO de uma doação — é o caminho do Google Pay/Apple Pay
 * (a carteira entrega um cartão tokenizado ao gateway).
 *
 * Devolve o `clientSecret` junto, mas ele **não é persistido**: é um segredo
 * efêmero que o app usa para confirmar a cobrança no dispositivo. Assim como no
 * Pix, o vale só é liberado quando o webhook confirmar o pagamento.
 */
export async function createCardChargeForDonation(donationId: string, amount: number) {
  if (!paymentProvider.createCardPayment) {
    throw new AppError(
      `O provedor de pagamento ativo (${paymentProvider.name}) não suporta cartão. ` +
        'Configure PAYMENT_PROVIDER=stripe.',
      501,
      'card_not_supported',
    );
  }

  const charge = await paymentProvider.createCardPayment({ donationId, amount });
  const payment = await prisma.payment.create({
    data: {
      donationId,
      provider: paymentProvider.name,
      method: 'card',
      status: 'pending',
      amount,
      externalPaymentId: charge.externalPaymentId,
    },
  });
  await prisma.donation.update({ where: { id: donationId }, data: { paymentId: payment.id } });
  return { payment, clientSecret: charge.clientSecret };
}

export async function getPaymentForActor(actor: { userId: string; role: UserRole }, paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new AppError('Pagamento não encontrado', 404, 'payment_not_found');
  if (actor.role === 'admin') return payment;
  if (actor.role === 'donor') {
    const donation = await prisma.donation.findUnique({
      where: { id: payment.donationId },
      select: { donorId: true },
    });
    if (donation?.donorId === actor.userId) return payment;
  }
  throw new AppError('Acesso negado', 403, 'forbidden');
}

/**
 * Processa um evento de pagamento de forma IDEMPOTENTE.
 * A unicidade de PaymentEvent.externalEventId garante que o mesmo evento não
 * seja processado duas vezes (mesmo sob corrida).
 */
export async function processWebhookEvent(evt: WebhookEvent) {
  const payment = await prisma.payment.findUnique({ where: { externalPaymentId: evt.externalPaymentId } });
  if (!payment) {
    // pagamento desconhecido — não vaza nada; webhook responde 200 (ignorado)
    return { status: 'ignored_unknown_payment' as const };
  }

  // Idempotência: registra o evento; se já existir (mesmo externalEventId), no-op.
  try {
    await prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        externalEventId: evt.externalEventId,
        eventType: evt.type,
        payload: evt.raw as object,
        processedAt: new Date(),
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return { status: 'duplicate_ignored' as const };
    }
    throw e;
  }

  if (evt.status === 'paid') {
    // Não paga cobrança expirada/cancelada/falha (evita liberar vale fora de validade).
    if (payment.status === 'expired' || payment.status === 'canceled' || payment.status === 'failed') {
      return { status: 'ignored_not_payable' as const };
    }
    const fulfillment = await fulfillPaidDonation(payment.donationId, null);
    await createAuditLog({
      action: 'payment_webhook_paid',
      entityType: 'payment',
      entityId: payment.id,
      metadata: {
        donationId: payment.donationId,
        externalEventId: evt.externalEventId,
        fulfillmentOutcome: fulfillment.outcome,
      },
    });
    return { status: 'processed_paid' as const, fulfillmentOutcome: fulfillment.outcome };
  }

  if (evt.status === 'expired' || evt.status === 'failed' || evt.status === 'canceled') {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: evt.status } });
    return { status: 'processed_other' as const };
  }

  return { status: 'processed_noop' as const };
}

/**
 * Expira cobranças Pix vencidas (status `pending` com `expiresAt` no passado) e
 * marca as doações correspondentes como `failed`. Em produção, chamar via cron.
 */
export async function expireOverduePayments() {
  const now = new Date();
  const overdue = await prisma.payment.findMany({
    where: { status: 'pending', expiresAt: { lt: now } },
    select: { id: true, donationId: true },
  });
  if (overdue.length === 0) return { expired: 0 };

  const paymentIds = overdue.map((o) => o.id);
  const donationIds = overdue.map((o) => o.donationId);
  await prisma.$transaction([
    prisma.payment.updateMany({ where: { id: { in: paymentIds } }, data: { status: 'expired' } }),
    prisma.donation.updateMany({
      where: { id: { in: donationIds }, status: 'pending_payment' },
      data: { status: 'failed', failureReason: 'payment_expired' },
    }),
  ]);
  return { expired: overdue.length };
}
