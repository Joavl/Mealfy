import type { Donation, DonationMessage, Family } from '@prisma/client';

type FamilyLite = Pick<Family, 'id' | 'displayName' | 'city' | 'state'> | null | undefined;

/**
 * Mensagens escolhidas por doador e beneficiário. Ficam em chaves próprias
 * (`sentMessage` / `receivedMessage`) porque o campo `message` do DTO já existe
 * e significa outra coisa: o texto de STATUS da doação.
 */
const splitMessages = (messages: DonationMessage[] | undefined, mine: DonationMessage['author']) => {
  const sent = messages?.find((m) => m.author === mine) ?? null;
  const received = messages?.find((m) => m.author !== mine) ?? null;
  return {
    sentMessage: sent ? { templateKey: sent.templateKey, body: sent.body, createdAt: sent.createdAt } : null,
    receivedMessage: received
      ? { templateKey: received.templateKey, body: received.body, createdAt: received.createdAt }
      : null,
  };
};

const donorMessage = (status: Donation['status']): string | null => {
  switch (status) {
    case 'completed':
      return 'Família recebeu o apoio.';
    case 'pending_payment':
      return 'Pagamento pendente.';
    case 'gift_card_purchase_pending':
      return 'Pagamento confirmado. Estamos processando seu apoio.';
    case 'manual_review':
      return 'Estamos finalizando seu apoio. Em breve a família será alimentada.';
    case 'canceled':
      return 'Doação cancelada.';
    case 'failed':
      return 'Doação não concluída.';
    default:
      return null;
  }
};

/**
 * Visão do DOADOR — NUNCA inclui o código do gift card (nem mascarado).
 * Mostra impacto: status, provider e "alimentada por você".
 */
export function toDonorDonation(
  d: Donation & { messages?: DonationMessage[] },
  family?: FamilyLite,
  currentUserId?: string,
) {
  return {
    id: d.id,
    status: d.status,
    amount: d.amount,
    provider: d.provider,
    familyId: d.familyId,
    familyName: family?.displayName ?? null,
    city: family?.city ?? null,
    state: family?.state ?? null,
    createdAt: d.createdAt,
    completedAt: d.completedAt,
    message: donorMessage(d.status),
    providerLabel:
      d.status === 'completed' ? `Vale ${providerLabel(d.provider)} enviado para a família.` : null,
    fedByYou: d.status === 'completed' && d.donorId === currentUserId,
    // Do ponto de vista do doador: enviada = a dele, recebida = a da família.
    ...splitMessages(d.messages, 'donor'),
  };
}

/** Visão ADMIN/ENTIDADE — também NUNCA inclui o código. */
export function toAdminDonation(d: Donation, family?: FamilyLite) {
  return {
    id: d.id,
    donorId: d.donorId,
    familyId: d.familyId,
    familyName: family?.displayName ?? null,
    amount: d.amount,
    provider: d.provider,
    status: d.status,
    giftCardId: d.giftCardId,
    paymentId: d.paymentId,
    failureReason: d.failureReason,
    createdAt: d.createdAt,
    completedAt: d.completedAt,
    canceledAt: d.canceledAt,
  };
}

export function providerLabel(provider: Donation['provider']): string {
  if (provider === 'ninetynine') return '99 Mercado';
  if (provider === 'ifood') return 'iFood';
  return 'Carrefour';
}
