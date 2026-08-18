import crypto from 'crypto';
import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { env } from '../../config/env';
import { prisma } from '../../database/prisma';
import { paymentProvider } from './providers';
import * as paymentsService from './payments.service';
import { toPaymentDto } from './payments.dto';

/**
 * Webhook do gateway (PÚBLICO — autenticado pela assinatura, não por JWT).
 * Verifica a assinatura, normaliza o evento e processa de forma idempotente.
 */
export async function webhook(req: Request, res: Response): Promise<Response> {
  const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body ?? {});
  // Cada gateway usa seu próprio cabeçalho: o Stripe assina em `Stripe-Signature`;
  // o mock (e a maioria dos gateways Pix) usa `x-webhook-signature`.
  const signature =
    req.header('stripe-signature') ??
    req.header('x-webhook-signature') ??
    req.header('x-signature');
  const evt = paymentProvider.verifyAndParseWebhook(raw, signature);
  const result = await paymentsService.processWebhookEvent(evt);
  return res.json({ received: true, ...result });
}

/** Simulação de pagamento (dev/staging, admin) — gera um webhook assinado e o processa. */
export async function simulatePaid(req: Request, res: Response): Promise<Response> {
  if (env.NODE_ENV === 'production') {
    throw new AppError('Simulação indisponível em produção.', 403, 'simulate_disabled_in_prod');
  }
  if (!env.PAYMENT_WEBHOOK_SECRET) {
    throw new AppError('PAYMENT_WEBHOOK_SECRET não configurado.', 500, 'webhook_secret_missing');
  }
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!payment || !payment.externalPaymentId) {
    throw new AppError('Pagamento não encontrado', 404, 'payment_not_found');
  }
  const body = JSON.stringify({
    externalEventId: `sim_${crypto.randomUUID()}`,
    externalPaymentId: payment.externalPaymentId,
    type: 'payment.paid',
    status: 'paid',
  });
  const signature = crypto.createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET).update(body).digest('hex');
  const evt = paymentProvider.verifyAndParseWebhook(body, signature);
  const result = await paymentsService.processWebhookEvent(evt);
  return res.json({ simulated: true, ...result });
}

/** Expira cobranças vencidas (admin; em produção seria um cron). */
export async function expireOverdue(_req: Request, res: Response): Promise<Response> {
  const result = await paymentsService.expireOverduePayments();
  return res.json(result);
}

export async function getPayment(req: Request, res: Response): Promise<Response> {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  const payment = await paymentsService.getPaymentForActor(
    { userId: req.auth.userId, role: req.auth.role },
    req.params.id,
  );
  return res.json({ payment: toPaymentDto(payment) });
}
