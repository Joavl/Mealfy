import crypto from 'crypto';
import type { PaymentStatus } from '@prisma/client';
import { env } from '../../../config/env';
import { AppError } from '../../../shared/errors/AppError';
import type { CreatePixInput, PaymentProvider, PixCharge, WebhookEvent } from './paymentProvider';

/**
 * Pix MOCK (dev/staging). Gera QR/copia-e-cola fictícios e valida o webhook por
 * HMAC-SHA256 com PAYMENT_WEBHOOK_SECRET. NÃO movimenta dinheiro real.
 * Substituível por um RealPixProvider quando o gateway for escolhido.
 */
export class MockPixProvider implements PaymentProvider {
  readonly name = 'mock_pix';

  async createPixPayment(input: CreatePixInput): Promise<PixCharge> {
    const externalPaymentId = `mockpix_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + input.expiresInMinutes * 60_000);
    const reais = (input.amount / 100).toFixed(2);
    const pixCopyPaste = `00020126MOCKPIX-${input.donationId.slice(0, 8)}5204000053039865406${reais}5802BR5906MEALFY6009SAO PAULO62070503***6304${externalPaymentId.slice(-4)}`;
    const pixQrCode = `data:image/png;base64,MOCKQR_${Buffer.from(externalPaymentId).toString('base64')}`;
    return { externalPaymentId, pixQrCode, pixCopyPaste, expiresAt };
  }

  async getPaymentStatus(_externalPaymentId: string): Promise<PaymentStatus> {
    // O mock não mantém estado externo; o status efetivo chega via webhook/simulate.
    return 'pending';
  }

  verifyAndParseWebhook(rawBody: string, signature: string | undefined): WebhookEvent {
    const secret = env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) {
      throw new AppError('PAYMENT_WEBHOOK_SECRET não configurado no servidor.', 500, 'webhook_secret_missing');
    }
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(signature ?? '', 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new AppError('Assinatura de webhook inválida.', 401, 'invalid_signature');
    }

    let body: { externalEventId?: string; externalPaymentId?: string; type?: string; status?: string };
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new AppError('Payload de webhook inválido.', 400, 'invalid_payload');
    }
    if (!body.externalEventId || !body.externalPaymentId || !body.status) {
      throw new AppError('Webhook sem campos obrigatórios.', 400, 'invalid_payload');
    }
    return {
      externalEventId: body.externalEventId,
      externalPaymentId: body.externalPaymentId,
      type: body.type ?? 'payment.updated',
      status: body.status as WebhookEvent['status'],
      raw: body,
    };
  }
}
