import { v4 as uuidv4 } from 'uuid';
import { MockDatabase } from '../../database/mock-db';
import { AppError } from '../../shared/errors/AppError';
import { Donation, Family, GiftCard, User } from '../../shared/types';

export class DonationsService {
  private static calculateAmount(childrenCount: number): number {
    if (childrenCount === 1) return 30;
    if (childrenCount === 2) return 40;
    return 50; // 3+ children
  }

  static async create(familyId: string, donor: User): Promise<{ donation: Donation, giftCard: GiftCard }> {
    const families = await MockDatabase.read<Family>('families');
    const fIdx = families.findIndex(f => f.id === familyId);

    if (fIdx === -1) throw new AppError('Family not found', 404);
    
    const family = families[fIdx];
    const amount = this.calculateAmount(family.childrenCount);

    const donation: Donation = {
      id: `don-${uuidv4()}`,
      donorId: donor.id,
      familyId: family.id,
      amount,
      createdAt: new Date().toISOString()
    };

    const giftCard: GiftCard = {
      id: `gc-${uuidv4()}`,
      donationId: donation.id,
      familyId: family.id,
      provider: 'ifood',
      code: `MEALFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      amount,
      status: 'sent',
      label: `Crédito iFood — R$ ${amount}`,
      createdAt: new Date().toISOString()
    };

    // Update family status
    families[fIdx].supportStatus = 'fed';
    families[fIdx].lastFedAt = new Date().toISOString();

    // Update donor total
    const users = await MockDatabase.read<User>('users');
    const uIdx = users.findIndex(u => u.id === donor.id);
    if (uIdx !== -1) {
      users[uIdx].totalDonated += amount;
    }

    const donations = await MockDatabase.read<Donation>('donations');
    const giftCards = await MockDatabase.read<GiftCard>('giftcards');

    donations.unshift(donation);
    giftCards.unshift(giftCard);

    await MockDatabase.write('families', families);
    await MockDatabase.write('users', users);
    await MockDatabase.write('donations', donations);
    await MockDatabase.write('giftcards', giftCards);

    await MockDatabase.appendAuditLog({ type: 'CREATE_DONATION', donationId: donation.id, donorId: donor.id, amount });

    return { donation, giftCard };
  }

  static async createBatch(familyIds: string[], donor: User): Promise<any[]> {
    const results = [];
    for (const id of familyIds) {
      try {
        const res = await this.create(id, donor);
        results.push(res);
      } catch (e) {
        console.error(`Failed to donate to ${id}`, e);
      }
    }
    return results;
  }

  static async listMyDonations(userId: string): Promise<any[]> {
    const donations = await MockDatabase.read<Donation>('donations');
    const giftCards = await MockDatabase.read<GiftCard>('giftcards');
    const families = await MockDatabase.read<Family>('families');

    return donations
      .filter(d => d.donorId === userId)
      .map(d => ({
        ...d,
        giftCard: giftCards.find(gc => gc.donationId === d.id),
        family: families.find(f => f.id === d.familyId)
      }));
  }

  static async createRegional(communityId: string, totalAmount: number, donor: User): Promise<any> {
    const families = await MockDatabase.read<Family>('families');
    const eligibleFamilies = families.filter(f => f.communityId === communityId && f.supportStatus === 'needs_help');

    if (eligibleFamilies.length === 0) {
      throw new AppError('No families in need found in this community', 400);
    }

    const amountPerFamily = Math.floor(totalAmount / eligibleFamilies.length);
    const results = [];

    for (const family of eligibleFamilies) {
      const res = await this.create(family.id, donor); // Reuse existing create logic (which handles balance, status, etc.)
      results.push(res);
    }

    return {
      communityId,
      totalDistributedAmount: totalAmount,
      impactedFamiliesCount: eligibleFamilies.length,
      donations: results.map(r => r.donation),
      giftCards: results.map(r => r.giftCard)
    };
  }
}
