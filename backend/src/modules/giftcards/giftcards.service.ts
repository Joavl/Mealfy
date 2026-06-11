import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { MockDatabase } from '../../database/mock-db';
import { AppError } from '../../shared/errors/AppError';
import { voucherProvider } from '../vouchers/voucherProvider';
import { GiftCardStatus } from '@prisma/client';

export class GiftCardsService {
  static getIfoodInfo(code: string) {
    return voucherProvider.getInfo(code);
  }

  static async listByFamily(familyId: string): Promise<any[]> {
    if (env.DATABASE_MODE === 'prisma') {
      const vouchers = await prisma.voucher.findMany({
        where: { familyId },
        orderBy: { createdAt: 'desc' },
      });

      return vouchers.map((v) => ({
        id: v.id,
        donationId: v.donationId,
        familyId: v.familyId,
        donorId: v.donorId,
        provider: v.provider,
        code: v.code,
        amount: Number(v.amount),
        status: v.status.toLowerCase(),
        label: v.label,
        message: v.message,
        createdAt: v.createdAt.toISOString(),
        redeemedAt: v.redeemedAt?.toISOString() || null,
      }));
    } else {
      const cards = await MockDatabase.read<any>('giftcards');
      return cards
        .filter((c) => c.familyId === familyId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  static async getActiveForFamily(familyId: string): Promise<any | null> {
    const cards = await this.listByFamily(familyId);
    const active = cards.find(
      (c) => c.status === 'sent' || c.status === 'generated' || c.status === 'delivered',
    );
    return active ?? cards[0] ?? null;
  }

  static async redeem(giftCardId: string, user: any): Promise<{ giftCard: any; ifood: any }> {
    const userRole = (user.role || '').toUpperCase();
    if (userRole !== 'BENEFICIARY' || !user.beneficiaryId) {
      throw new AppError('Apenas beneficiários podem resgatar', 403);
    }

    if (env.DATABASE_MODE === 'prisma') {
      const voucher = await prisma.voucher.findUnique({
        where: { id: giftCardId },
      });

      if (!voucher) throw new AppError('Gift card não encontrado', 404);
      if (voucher.familyId !== user.beneficiaryId) {
        throw new AppError('Este crédito não pertence à sua família', 403);
      }

      let updated = voucher;
      if (voucher.status !== GiftCardStatus.REDEEMED) {
        updated = await prisma.voucher.update({
          where: { id: giftCardId },
          data: {
            status: GiftCardStatus.REDEEMED,
            redeemedAt: new Date(),
          },
        });
      }

      const formatted = {
        id: updated.id,
        donationId: updated.donationId,
        familyId: updated.familyId,
        donorId: updated.donorId,
        provider: updated.provider,
        code: updated.code,
        amount: Number(updated.amount),
        status: updated.status.toLowerCase(),
        label: updated.label,
        message: updated.message,
        createdAt: updated.createdAt.toISOString(),
        redeemedAt: updated.redeemedAt?.toISOString() || null,
      };

      return {
        giftCard: formatted,
        ifood: this.getIfoodInfo(updated.code),
      };
    } else {
      const cards = await MockDatabase.read<any>('giftcards');
      const idx = cards.findIndex((c) => c.id === giftCardId);
      if (idx === -1) throw new AppError('Gift card não encontrado', 404);

      const card = cards[idx];
      if (card.familyId !== user.beneficiaryId) {
        throw new AppError('Este crédito não pertence à sua família', 403);
      }

      if (card.status !== 'redeemed') {
        cards[idx] = { ...card, status: 'redeemed', redeemedAt: new Date().toISOString() };
        await MockDatabase.write('giftcards', cards);
      }

      const updated = cards[idx];
      return { giftCard: updated, ifood: this.getIfoodInfo(updated.code) };
    }
  }
}
