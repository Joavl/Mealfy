import type { GiftCard, GiftCardStatus } from '../backend/types';

export const IFOOD_PROVIDER = 'ifood' as const;

export const IFOOD_AMOUNT_TIERS = [
  { value: 30, impact: '1 refeição infantil via iFood (24h de apoio)', minChildren: 1 },
  { value: 40, impact: '2 refeições via iFood (família com 2 crianças)', minChildren: 2 },
  { value: 50, impact: '3+ refeições via iFood (família ampliada)', minChildren: 3 },
] as const;

export const IFOOD_FLOW_STEPS = [
  { step: 1, title: 'Você confirma o valor', desc: 'Escolhe o pacote de refeições para a família.' },
  { step: 2, title: 'Mealfy gera o crédito iFood', desc: 'Convertemos sua contribuição em gift card parceiro.' },
  { step: 3, title: 'A família recebe no app', desc: 'O voucher chega no painel do beneficiário para pedir refeições.' },
] as const;

export function buildIfoodGiftLabel(amount: number): string {
  return `Crédito iFood — R$ ${amount}`;
}

export function generateIfoodGiftCode(): string {
  const segment = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MEALFY-${segment}`;
}

export function getGiftStatusLabel(status: GiftCardStatus): string {
  const map: Record<GiftCardStatus, string> = {
    generated: 'Crédito gerado',
    sent: 'Enviado para a família',
    delivered: 'Disponível no iFood',
    used: 'Resgatado',
    redeemed: 'Resgatado',
  };
  return map[status] ?? 'Em processamento';
}

export function isIfoodGift(card: Pick<GiftCard, 'provider'>): boolean {
  return card.provider === IFOOD_PROVIDER || String(card.provider).toLowerCase().includes('ifood');
}

export function getIfoodRedeemDeepLink(code: string): string {
  return `https://www.ifood.com.br/gift-card?code=${encodeURIComponent(code)}`;
}

export const IFOOD_REDEEM_STEPS = [
  'Abra o app iFood no celular',
  'Vá em Perfil → Carteira → Gift Card',
  'Toque em "Adicionar código" e cole o código Mealfy',
  'Use o saldo em restaurantes parceiros da sua região',
] as const;

export function normalizeGiftCard(card: Partial<GiftCard> & { amount: number; donationId: string }): GiftCard {
  const provider = card.provider === IFOOD_PROVIDER || !card.provider ? IFOOD_PROVIDER : card.provider;
  return {
    id: card.id ?? `gc-${Date.now()}`,
    familyId: card.familyId ?? '',
    donorId: card.donorId ?? '',
    donationId: card.donationId,
    amount: card.amount,
    createdAt: card.createdAt ?? new Date().toISOString(),
    status: card.status ?? 'generated',
    label: card.label ?? buildIfoodGiftLabel(card.amount),
    provider,
    code: card.code ?? generateIfoodGiftCode(),
  };
}
