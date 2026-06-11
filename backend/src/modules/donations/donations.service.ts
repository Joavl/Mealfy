import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { MockDatabase } from '../../database/mock-db';
import { AppError } from '../../shared/errors/AppError';
import { voucherProvider } from '../vouchers/voucherProvider';
import { SupportStatus, GiftCardStatus } from '@prisma/client';

export class DonationsService {
  private static calculateAmount(childrenCount: number): number {
    if (childrenCount === 1) return 30;
    if (childrenCount === 2) return 40;
    return 50; // 3+ children
  }

  static async create(
    familyId: string,
    donor: any,
    amountOverride?: number,
    message?: string,
    communityId?: string,
  ): Promise<{ donation: any; giftCard: any }> {
    if (env.DATABASE_MODE === 'prisma') {
      const family = await prisma.family.findUnique({
        where: { id: familyId },
      });

      if (!family) throw new AppError('Family not found', 404);

      const amount = amountOverride && amountOverride > 0
        ? amountOverride
        : this.calculateAmount(family.childrenCount);

      const donationId = randomUUID();
      const voucherId = randomUUID();
      const code = voucherProvider.generateCode();
      const label = voucherProvider.buildLabel(amount);

      // Create donation and voucher, update family in transaction
      const [donation, voucher] = await prisma.$transaction([
        prisma.donation.create({
          data: {
            id: donationId,
            donorId: donor.id,
            familyId: family.id,
            amount: amount,
            communityId,
            message,
          },
        }),
        prisma.voucher.create({
          data: {
            id: voucherId,
            donationId: donationId,
            familyId: family.id,
            donorId: donor.id,
            provider: 'mock-provider',
            code: code,
            amount: amount,
            status: GiftCardStatus.SENT,
            label: label,
            message,
          },
        }),
        prisma.family.update({
          where: { id: family.id },
          data: {
            supportStatus: SupportStatus.FED,
            lastFedAt: new Date(),
          },
        }),
        prisma.donorProfile.upsert({
          where: { userId: donor.id },
          update: {
            totalDonated: { increment: amount },
          },
          create: {
            userId: donor.id,
            totalDonated: amount,
            showOnRanking: true,
          },
        }),
      ]);

      await prisma.auditLog.create({
        data: {
          userId: donor.id,
          action: 'CREATE_DONATION',
          entityType: 'DONATION',
          entityId: donationId,
        },
      });

      // Format return to match frontend expected types
      return {
        donation: {
          id: donation.id,
          donorId: donation.donorId,
          familyId: donation.familyId,
          amount: Number(donation.amount),
          communityId: donation.communityId,
          message: donation.message,
          createdAt: donation.createdAt.toISOString(),
        },
        giftCard: {
          id: voucher.id,
          donationId: voucher.donationId,
          familyId: voucher.familyId,
          donorId: voucher.donorId,
          provider: voucher.provider,
          code: voucher.code,
          amount: Number(voucher.amount),
          status: 'sent',
          label: voucher.label,
          message: voucher.message,
          createdAt: voucher.createdAt.toISOString(),
        },
      };
    } else {
      const families = await MockDatabase.read<any>('families');
      const fIdx = families.findIndex((f) => f.id === familyId);

      if (fIdx === -1) throw new AppError('Family not found', 404);
      
      const family = families[fIdx];
      const amount = amountOverride && amountOverride > 0
        ? amountOverride
        : this.calculateAmount(family.childrenCount);

      const donation = {
        id: `don-${randomUUID()}`,
        donorId: donor.id,
        familyId: family.id,
        amount,
        communityId,
        message,
        createdAt: new Date().toISOString(),
      };

      const giftCard = {
        id: `gc-${randomUUID()}`,
        donationId: donation.id,
        familyId: family.id,
        donorId: donor.id,
        provider: 'mock-provider',
        code: voucherProvider.generateCode(),
        amount,
        status: 'sent',
        label: voucherProvider.buildLabel(amount),
        message,
        createdAt: new Date().toISOString(),
      };

      // Update family
      families[fIdx].supportStatus = 'fed';
      families[fIdx].lastFedAt = new Date().toISOString();

      // Update donor total
      const users = await MockDatabase.read<any>('users');
      const uIdx = users.findIndex((u) => u.id === donor.id);
      if (uIdx !== -1) {
        users[uIdx].totalDonated = (users[uIdx].totalDonated || 0) + amount;
      }

      const donations = await MockDatabase.read<any>('donations');
      const giftCards = await MockDatabase.read<any>('giftcards');

      donations.unshift(donation);
      giftCards.unshift(giftCard);

      await MockDatabase.write('families', families);
      await MockDatabase.write('users', users);
      await MockDatabase.write('donations', donations);
      await MockDatabase.write('giftcards', giftCards);

      await MockDatabase.appendAuditLog({ type: 'CREATE_DONATION', donationId: donation.id, donorId: donor.id, amount });

      return { donation, giftCard };
    }
  }

  static async createBatch(familyIds: string[], donor: any, amountPerFamily?: number): Promise<any[]> {
    const results = [];
    for (const id of familyIds) {
      try {
        const res = await this.create(id, donor, amountPerFamily);
        results.push(res);
      } catch (e) {
        console.error(`Failed to donate to ${id}`, e);
      }
    }
    return results;
  }

  static async listMyDonations(userId: string): Promise<any[]> {
    if (env.DATABASE_MODE === 'prisma') {
      const donations = await prisma.donation.findMany({
        where: { donorId: userId },
        include: {
          family: true,
          voucher: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return donations.map((d) => ({
        id: d.id,
        donorId: d.donorId,
        familyId: d.familyId,
        amount: Number(d.amount),
        communityId: d.communityId,
        message: d.message,
        createdAt: d.createdAt.toISOString(),
        giftCard: d.voucher ? {
          id: d.voucher.id,
          donationId: d.voucher.donationId,
          familyId: d.voucher.familyId,
          donorId: d.voucher.donorId,
          provider: d.voucher.provider,
          code: d.voucher.code,
          amount: Number(d.voucher.amount),
          status: d.voucher.status.toLowerCase(),
          label: d.voucher.label,
          message: d.voucher.message,
          createdAt: d.voucher.createdAt.toISOString(),
          redeemedAt: d.voucher.redeemedAt?.toISOString() || null,
        } : null,
        family: d.family,
      }));
    } else {
      const donations = await MockDatabase.read<any>('donations');
      const giftCards = await MockDatabase.read<any>('giftcards');
      const families = await MockDatabase.read<any>('families');

      return donations
        .filter((d) => d.donorId === userId)
        .map((d) => ({
          ...d,
          giftCard: giftCards.find((gc) => gc.donationId === d.id),
          family: families.find((f) => f.id === d.familyId),
        }));
    }
  }

  static async createRegional(communityId: string, totalAmount: number, donor: any): Promise<any> {
    if (env.DATABASE_MODE === 'prisma') {
      const families = await prisma.family.findMany({
        where: {
          supportStatus: SupportStatus.NEEDS_HELP,
          status: FamilyStatus.APPROVED,
          isDeleted: false,
        },
      });

      // Filter families inside community region / city
      const eligibleFamilies = families.filter((f) =>
        f.region.includes(communityId) ||
        (f.neighborhood && f.neighborhood.includes(communityId)) ||
        f.city === communityId
      );

      if (eligibleFamilies.length === 0) {
        throw new AppError('No families in need found in this community', 400);
      }

      const amountPerFamily = Math.floor(totalAmount / eligibleFamilies.length);
      if (amountPerFamily <= 0) {
        throw new AppError('Valor total insuficiente para distribuir entre as famílias', 400);
      }

      const results = [];
      for (const family of eligibleFamilies) {
        const res = await this.create(family.id, donor, amountPerFamily, `Doação Regional - ${communityId}`, communityId);
        results.push(res);
      }

      return {
        communityId,
        totalDistributedAmount: totalAmount,
        impactedFamiliesCount: eligibleFamilies.length,
        donations: results.map((r) => r.donation),
        giftCards: results.map((r) => r.giftCard),
      };
    } else {
      const families = await MockDatabase.read<any>('families');
      const eligibleFamilies = families.filter(
        (f) =>
          f.supportStatus === 'needs_help' &&
          (f.region?.toLowerCase().includes(communityId.toLowerCase()) ||
            f.neighborhood?.toLowerCase().includes(communityId.toLowerCase()) ||
            f.city?.toLowerCase() === communityId.toLowerCase())
      );

      if (eligibleFamilies.length === 0) {
        throw new AppError('No families in need found in this community', 400);
      }

      const amountPerFamily = Math.floor(totalAmount / eligibleFamilies.length);
      if (amountPerFamily <= 0) {
        throw new AppError('Valor total insuficiente para distribuir entre as famílias', 400);
      }

      const results = [];
      for (const family of eligibleFamilies) {
        const res = await this.create(family.id, donor, amountPerFamily, `Doação Regional - ${communityId}`, communityId);
        results.push(res);
      }

      return {
        communityId,
        totalDistributedAmount: totalAmount,
        impactedFamiliesCount: eligibleFamilies.length,
        donations: results.map((r) => r.donation),
        giftCards: results.map((r) => r.giftCard),
      };
    }
  }
}
