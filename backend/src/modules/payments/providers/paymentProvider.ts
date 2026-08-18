import type { PaymentStatus } from '@prisma/client';

export interface CreatePixInput {
  amount: number; // centavos
  donationId: string;
  expiresInMinutes: number;
}

export interface PixCharge {
  externalPaymentId: string;
  pixQrCode: string;
  pixCopyPaste: string;
  expiresAt: Date;
}

export interface WebhookEvent {
  externalEventId: string;
  externalPaymentId: string;
  type: string;
  status: PaymentStatus;
  raw: unknown;
}

export interface CreateCardPaymentInput {
  amount: number; // centavos
  donationId: string;
  /** Texto que aparece no extrato/recibo do doador. */
  description?: string;
}

/**
 * Cobrança por cartão criada no gateway, ainda NÃO confirmada.
 *
 * O app confirma no dispositivo: abre a carteira (Google Pay), o usuário
 * autoriza e o SDK do gateway confirma a cobrança usando o `clientSecret`.
 * O backend nunca vê o número do cartão nem o token da carteira — só o
 * webhook posterior é que muda o status para `paid`.
 */
export interface CardCharge {
  externalPaymentId: string;
  /** Segredo de curta duração usado pelo SDK no app para confirmar. Não persistir. */
  clientSecret: string;
  status: PaymentStatus;
}

/**
 * Contrato do gateway de pagamento. `mock` implementa só Pix; `stripe` implementa
 * Pix e cartão (este último é o caminho do Google Pay / Apple Pay).
 */
export interface PaymentProvider {
  readonly name: string;
  createPixPayment(input: CreatePixInput): Promise<PixCharge>;
  getPaymentStatus(externalPaymentId: string): Promise<PaymentStatus>;
  /** Verifica assinatura do webhook e devolve o evento normalizado. Lança se inválido. */
  verifyAndParseWebhook(rawBody: string, signature: string | undefined): WebhookEvent;
  /**
   * Opcional: providers que suportam cartão/carteira digital. Ausente no mock —
   * o serviço responde 501 quando o provider ativo não implementa.
   */
  createCardPayment?(input: CreateCardPaymentInput): Promise<CardCharge>;
}
