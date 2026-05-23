import { MockDatabase } from '../../database/mock-db';
import { AppError } from '../../shared/errors/AppError';
import { GiftCard, User } from '../../shared/types';

const IFOOD_WALLET_PATH = 'Perfil → Carteira → Gift Card';

export class GiftCardsService {
  static getIfoodInfo(code: string) {
    return {
      provider: 'ifood',
      partnerName: 'iFood',
      redeemInstructions:
        'Abra o app iFood → Perfil → Carteira / Gift Card → Adicionar código → cole o código Mealfy.',
      redeemDeepLink: `https://www.ifood.com.br/gift-card?code=${encodeURIComponent(code)}`,
      walletPath: IFOOD_WALLET_PATH,
    };
  }

  static async listByFamily(familyId: string): Promise<GiftCard[]> {
    const cards = await MockDatabase.read<GiftCard>('giftcards');
    return cards
      .filter((c) => c.familyId === familyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async getActiveForFamily(familyId: string): Promise<GiftCard | null> {
    const cards = await this.listByFamily(familyId);
    const active = cards.find(
      (c) => c.status === 'sent' || c.status === 'generated' || c.status === 'delivered',
    );
    return active ?? cards[0] ?? null;
  }

  static async redeem(giftCardId: string, user: User): Promise<{ giftCard: GiftCard; ifood: ReturnType<typeof GiftCardsService.getIfoodInfo> }> {
    if (user.role !== 'beneficiary' || !user.beneficiaryId) {
      throw new AppError('Apenas beneficiários podem resgatar', 403);
    }

    const cards = await MockDatabase.read<GiftCard>('giftcards');
    const idx = cards.findIndex((c) => c.id === giftCardId);
    if (idx === -1) throw new AppError('Gift card não encontrado', 404);

    const card = cards[idx];
    if (card.familyId !== user.beneficiaryId) {
      throw new AppError('Este crédito não pertence à sua família', 403);
    }

    if (card.status !== 'redeemed') {
      cards[idx] = { ...card, status: 'redeemed' };
      await MockDatabase.write('giftcards', cards);
    }

    const updated = cards[idx];
    return { giftCard: updated, ifood: this.getIfoodInfo(updated.code) };
  }
}
