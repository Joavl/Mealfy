import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';

/**
 * Família vinculada ao beneficiário logado. 403 se não houver vínculo.
 * Inclui dependentes: o beneficiário é o dono do próprio cadastro e a tela
 * precisa deles para mostrar quantas crianças estão cobertas.
 */
export async function getMyFamily(userId: string) {
  const family = await prisma.family.findFirst({
    where: { beneficiaryUserId: userId },
    include: { dependents: true },
  });
  if (!family) throw new AppError('Nenhuma família vinculada a este beneficiário.', 403, 'no_family');
  return family;
}

/**
 * Gift cards liberados para a família do beneficiário (mais recentes primeiro),
 * com as mensagens da doação de origem: é junto do vale que o beneficiário lê o
 * recado de quem apoiou e pode responder.
 *
 * As mensagens vêm em consulta separada porque `GiftCard.donationId` é campo
 * solto, sem relação declarada no schema — buscar em lote evita tanto alterar a
 * modelagem quanto uma consulta por vale (N+1).
 */
export async function listMyGiftCards(userId: string) {
  const family = await getMyFamily(userId);
  const cards = await prisma.giftCard.findMany({
    where: { familyId: family.id, status: 'used' },
    orderBy: { usedAt: 'desc' },
  });

  const donationIds = cards.map((c) => c.donationId).filter((id): id is string => Boolean(id));
  if (donationIds.length === 0) return cards.map((card) => ({ card, messages: [] }));

  const messages = await prisma.donationMessage.findMany({
    where: { donationId: { in: donationIds } },
  });
  const byDonation = new Map<string, typeof messages>();
  for (const m of messages) {
    const list = byDonation.get(m.donationId) ?? [];
    list.push(m);
    byDonation.set(m.donationId, list);
  }

  return cards.map((card) => ({
    card,
    messages: card.donationId ? byDonation.get(card.donationId) ?? [] : [],
  }));
}

export async function getMyGiftCard(userId: string, giftCardId: string) {
  const family = await getMyFamily(userId);
  const gc = await prisma.giftCard.findUnique({ where: { id: giftCardId } });
  if (!gc || gc.familyId !== family.id) {
    throw new AppError('Gift card não encontrado', 404, 'gift_card_not_found');
  }
  return gc;
}
