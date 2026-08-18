import type { Payment } from '@prisma/client';

/**
 * DTO de pagamento — devolve o necessário para o doador pagar (QR/copia-e-cola)
 * + status. Não expõe segredos.
 */
export function toPaymentDto(p: Payment) {
  return {
    id: p.id,
    donationId: p.donationId,
    method: p.method,
    status: p.status,
    amount: p.amount,
    pixQrCode: p.pixQrCode,
    pixCopyPaste: p.pixCopyPaste,
    expiresAt: p.expiresAt,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  };
}
