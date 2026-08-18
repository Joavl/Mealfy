import Stripe from 'stripe';
import type { PaymentStatus } from '@prisma/client';
import { env } from '../../../config/env';
import { AppError } from '../../../shared/errors/AppError';
import type {
  CardCharge,
  CreateCardPaymentInput,
  CreatePixInput,
  PaymentProvider,
  PixCharge,
  WebhookEvent,
} from './paymentProvider';

/**
 * Gateway Stripe — cobre os dois meios que o app precisa:
 *  - `card`: caminho do **Google Pay / Apple Pay**. A carteira não é um meio de
 *    pagamento próprio: ela entrega um cartão tokenizado ao gateway. Por isso o
 *    fluxo é o de cartão, confirmado no dispositivo pelo SDK do Stripe.
 *  - `pix`: Pix nativo do Stripe Brasil (QR + copia-e-cola vêm em `next_action`).
 *
 * Fluxo do Google Pay (o backend nunca vê dados do cartão):
 *   1. app  → POST /payments (method=card)
 *   2. back → cria PaymentIntent e devolve `clientSecret`
 *   3. app  → abre o Google Pay e confirma com o SDK usando o `clientSecret`
 *   4. Stripe → webhook `payment_intent.succeeded` → status vira `paid`
 *
 * A liberação do vale continua acontecendo só no webhook (idempotente), igual
 * ao fluxo do Pix — nunca na resposta da criação da cobrança.
 */
export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  private readonly client: Stripe;

  constructor() {
    if (!env.STRIPE_SECRET_KEY) {
      throw new AppError(
        'STRIPE_SECRET_KEY não configurado no servidor.',
        501,
        'provider_not_configured',
      );
    }
    this.client = new Stripe(env.STRIPE_SECRET_KEY);
  }

  // ─── Cartão / Google Pay ──────────────────────────────────────────────────
  async createCardPayment(input: CreateCardPaymentInput): Promise<CardCharge> {
    const intent = await this.client.paymentIntents.create(
      {
        amount: input.amount,
        currency: 'brl',
        // Só cartão: é o que a carteira do Google entrega. Deixar o Stripe
        // escolher automaticamente abriria outros meios não previstos na UI.
        payment_method_types: ['card'],
        description: input.description ?? 'Apoio alimentar Mealfy',
        metadata: { donationId: input.donationId },
      },
      // Evita cobrança duplicada se o app repetir a requisição.
      { idempotencyKey: `card_${input.donationId}` },
    );

    if (!intent.client_secret) {
      throw new AppError('Stripe não devolveu client_secret.', 502, 'gateway_error');
    }

    return {
      externalPaymentId: intent.id,
      clientSecret: intent.client_secret,
      status: mapIntentStatus(intent.status),
    };
  }

  // ─── Pix ──────────────────────────────────────────────────────────────────
  async createPixPayment(input: CreatePixInput): Promise<PixCharge> {
    const intent = await this.client.paymentIntents.create(
      {
        amount: input.amount,
        currency: 'brl',
        payment_method_types: ['pix'],
        payment_method_data: { type: 'pix' },
        payment_method_options: {
          pix: { expires_after_seconds: input.expiresInMinutes * 60 },
        },
        confirm: true,
        metadata: { donationId: input.donationId },
      },
      { idempotencyKey: `pix_${input.donationId}` },
    );

    // O Pix do Stripe entrega QR e copia-e-cola dentro de next_action.
    const qr = (intent.next_action as { pix_display_qr_code?: PixNextAction } | null)
      ?.pix_display_qr_code;
    if (!qr?.data) {
      throw new AppError('Stripe não devolveu os dados do Pix.', 502, 'gateway_error');
    }

    return {
      externalPaymentId: intent.id,
      pixQrCode: qr.image_url_png ?? qr.hosted_instructions_url ?? '',
      pixCopyPaste: qr.data,
      expiresAt: qr.expires_at
        ? new Date(qr.expires_at * 1000)
        : new Date(Date.now() + input.expiresInMinutes * 60_000),
    };
  }

  async getPaymentStatus(externalPaymentId: string): Promise<PaymentStatus> {
    const intent = await this.client.paymentIntents.retrieve(externalPaymentId);
    return mapIntentStatus(intent.status);
  }

  /**
   * Verificação delegada ao SDK (`constructEvent`), que confere a assinatura E a
   * janela de tempo — protege contra replay. Exige o corpo BRUTO da requisição.
   */
  verifyAndParseWebhook(rawBody: string, signature: string | undefined): WebhookEvent {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError(
        'STRIPE_WEBHOOK_SECRET não configurado no servidor.',
        500,
        'webhook_secret_missing',
      );
    }
    if (!signature) {
      throw new AppError('Webhook sem cabeçalho de assinatura.', 401, 'invalid_signature');
    }

    let event: Stripe.Event;
    try {
      event = this.client.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new AppError('Assinatura de webhook inválida.', 401, 'invalid_signature');
    }

    const externalPaymentId = extractPaymentIntentId(event);
    if (!externalPaymentId) {
      throw new AppError('Webhook sem PaymentIntent associado.', 400, 'invalid_payload');
    }

    return {
      // O id do evento do Stripe é estável — é a chave de idempotência.
      externalEventId: event.id,
      externalPaymentId,
      type: event.type,
      status: mapEventStatus(event.type),
      raw: event,
    };
  }
}

interface PixNextAction {
  data?: string;
  image_url_png?: string;
  hosted_instructions_url?: string;
  expires_at?: number;
}

/** PaymentIntent.status do Stripe → PaymentStatus do domínio. */
function mapIntentStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
  switch (status) {
    case 'succeeded':
      return 'paid';
    case 'canceled':
      return 'canceled';
    // Aguardando ação do doador (abrir carteira, pagar o Pix, 3-D Secure)
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
    case 'requires_capture':
    case 'processing':
    default:
      return 'pending';
  }
}

/**
 * Tipo do evento → status. Usa o EVENTO (não o intent) porque reembolso chega
 * como `charge.refunded`, quando o PaymentIntent segue `succeeded`.
 */
function mapEventStatus(type: string): PaymentStatus {
  switch (type) {
    case 'payment_intent.succeeded':
      return 'paid';
    case 'payment_intent.payment_failed':
      return 'failed';
    case 'payment_intent.canceled':
      return 'canceled';
    case 'charge.refunded':
    case 'charge.refund.updated':
      return 'refunded';
    default:
      return 'pending';
  }
}

/** Extrai o id do PaymentIntent de eventos de intent ou de charge. */
function extractPaymentIntentId(event: Stripe.Event): string | null {
  const obj = event.data.object as { id?: string; object?: string; payment_intent?: unknown };
  if (obj.object === 'payment_intent' && obj.id) return obj.id;
  if (typeof obj.payment_intent === 'string') return obj.payment_intent;
  if (obj.payment_intent && typeof obj.payment_intent === 'object') {
    const nested = obj.payment_intent as { id?: string };
    return nested.id ?? null;
  }
  return null;
}
