import type { Donation, GiftCard, Family, BigDonationResult } from '../types';
import { mockDonations, mockGiftCards } from '../mockData/donations';
import { familyService } from './familyService';
import { storage } from '../utils/storage';
import { randomDelay } from '../utils/delay';
import {
  buildIfoodGiftLabel,
  generateIfoodGiftCode,
  IFOOD_PROVIDER,
  normalizeGiftCard,
} from '../../lib/ifoodGift';

import { donationsApi } from '../../api/donationsApi';
import { handleApiError } from '../utils/fallback';

const DONATIONS_KEY = 'donations_db';
const GIFTCARDS_KEY = 'giftcards_db';

export const donationService = {
  initDB: () => {
    if (!storage.get(DONATIONS_KEY, null)) {
      storage.set(DONATIONS_KEY, mockDonations);
    }
    if (!storage.get(GIFTCARDS_KEY, null)) {
      storage.set(GIFTCARDS_KEY, mockGiftCards);
    }
  },

  generateGiftCard: async (payload: { amount: number, familyId: string, donorId: string, donationId: string }): Promise<GiftCard> => {
    await randomDelay(200, 500);
    donationService.initDB();

    const newGiftCard: GiftCard = {
      id: `gc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      familyId: payload.familyId,
      donorId: payload.donorId,
      donationId: payload.donationId,
      amount: payload.amount,
      createdAt: new Date().toISOString(),
      status: 'sent',
      label: buildIfoodGiftLabel(payload.amount),
      provider: IFOOD_PROVIDER,
      code: generateIfoodGiftCode(),
    };

    const cards = storage.get<GiftCard[]>(GIFTCARDS_KEY, mockGiftCards);
    cards.push(newGiftCard);
    storage.set(GIFTCARDS_KEY, cards);

    return newGiftCard;
  },

  createDonation: async (payload: { 
    amount: number; 
    communityId: string; 
    donorId?: string; 
    familyId?: string; 
    message?: string;
  }): Promise<{ donation: Donation, giftCard: GiftCard, familyAssigned: Family }> => {
    if (payload.familyId) {
      try {
        const response = await donationsApi.createDonation({ familyId: payload.familyId, amount: payload.amount });
        if (response && response.donation) {
          const giftCard = normalizeGiftCard({
            ...response.giftCard,
            donationId: response.donation.id,
            amount: response.giftCard?.amount ?? response.donation.amount,
            familyId: payload.familyId,
            donorId: payload.donorId,
          });
          const familyAssigned = await familyService.getFamilyById(payload.familyId);
          return {
            donation: response.donation,
            giftCard,
            familyAssigned: familyAssigned ?? ({ id: payload.familyId } as Family),
          };
        }
      } catch (e) {
        handleApiError(e, 'Create Donation');
      }
    }

    await randomDelay(1000, 2000); 
    donationService.initDB();

    const families = await familyService.getFamiliesByCommunity(payload.communityId);
    let selectedFamily: Family | undefined;

    if (payload.familyId) {
      selectedFamily = families.find(f => f.id === payload.familyId);
    }
    
    // Fallback if not specified or not found
    if (!selectedFamily) {
      selectedFamily = families.find(f => f.supportStatus === 'needs_help');
    }
    
    // Fallback if everyone is supported (edge case)
    if (!selectedFamily && families.length > 0) {
      selectedFamily = families[0];
    } else if (families.length === 0) {
      throw new Error("Todas as famílias desta comunidade já foram ajudadas!");
    }

    // Generate Gift Card
    const donorId = payload.donorId || `anon-${Date.now()}`;
    const donationId = `don-${Date.now()}`;
    
    const giftCard = await donationService.generateGiftCard({
      amount: payload.amount,
      familyId: selectedFamily!.id,
      donorId,
      donationId
    });

    // Create Donation Record
    const newDonation: Donation = {
      id: donationId,
      donorId,
      familyId: selectedFamily!.id,
      communityId: payload.communityId,
      amount: payload.amount,
      giftCardId: giftCard.id,
      createdAt: new Date().toISOString(),
      message: payload.message
    };

    // Save donation no matter if anonymous or not
    const donations = storage.get<Donation[]>(DONATIONS_KEY, mockDonations);
    donations.push(newDonation);
    storage.set(DONATIONS_KEY, donations);

    // ONLY Update Session total if the donor is NOT anonymous
    if (payload.donorId && !payload.donorId.startsWith('anon-')) {
      const USERS_KEY = 'users_db';
      const sessionUser = storage.get<any>('current_user', null);
      if (sessionUser && sessionUser.id === payload.donorId) {
         sessionUser.totalDonated += payload.amount;
         storage.set('current_user', sessionUser);
         const users = storage.get<any[]>(USERS_KEY, []);
         const idx = users.findIndex(u => u.id === sessionUser.id);
         if (idx !== -1) {
            users[idx].totalDonated += payload.amount;
            storage.set(USERS_KEY, users);
         }
      }
    }

    // Update Family Status
    const familyAssigned = await familyService.updateFamilyStatus(selectedFamily!.id, 'supported');
    familyAssigned.lastFedAt = new Date().toISOString();
    familyAssigned.supportStatus = 'fed';
    
    return { donation: newDonation, giftCard, familyAssigned };
  },

  createBatchDonation: async (payload: {
    familyIds: string[];
    amountPerFamily: number;
    donorId: string;
    communityId: string;
  }): Promise<{ donations: Donation[], giftCards: GiftCard[] }> => {
    try {
      const results = await donationsApi.createBatchDonation(payload.familyIds);
      if (results && results.length > 0) {
        return {
          donations: results.map((r: any) => r.donation),
          giftCards: results.map((r: any) => r.giftCard)
        };
      }
    } catch (e) {
      handleApiError(e, 'Create Batch Donation');
    }

    await randomDelay(1500, 2500);
    donationService.initDB();

    const donations: Donation[] = [];
    const giftCards: GiftCard[] = [];

    for (const familyId of payload.familyIds) {
      const donationId = `don-batch-${Date.now()}-${familyId}`;
      const gc = await donationService.generateGiftCard({
        amount: payload.amountPerFamily,
        familyId,
        donorId: payload.donorId,
        donationId
      });

      const don: Donation = {
        id: donationId,
        donorId: payload.donorId,
        familyId,
        communityId: payload.communityId,
        amount: payload.amountPerFamily,
        giftCardId: gc.id,
        createdAt: new Date().toISOString(),
        isBatch: true
      };

      const dones = storage.get<Donation[]>(DONATIONS_KEY, mockDonations);
      dones.push(don);
      storage.set(DONATIONS_KEY, dones);

      donations.push(don);
      giftCards.push(gc);

      // Update Family Status
      await familyService.updateFamilyStatus(familyId, 'supported');
      
      const FAMILIES_KEY = 'families_db';
      const allFamilies = storage.get<Family[]>(FAMILIES_KEY, []);
      const fIdx = allFamilies.findIndex(f => f.id === familyId);
      if (fIdx !== -1) {
        allFamilies[fIdx].lastFedAt = new Date().toISOString();
        allFamilies[fIdx].supportStatus = 'fed';
        storage.set(FAMILIES_KEY, allFamilies);
      }
    }

    return { donations, giftCards };
  },

  getDonationHistoryByUser: async (userId: string): Promise<{donation: Donation, giftCard: GiftCard}[]> => {
    try {
      const history = await donationsApi.getMyDonations();
      if (history) {
        return history.map((h: any) => ({
          donation: h,
          giftCard: h.giftCard
        })).reverse();
      }
    } catch (e) {
      handleApiError(e, 'Get Donation History');
    }

    await randomDelay(400, 800);
    donationService.initDB();
    const donations = storage.get<Donation[]>(DONATIONS_KEY, mockDonations).filter(d => d.donorId === userId);
    const giftCards = storage.get<GiftCard[]>(GIFTCARDS_KEY, mockGiftCards);
    
    return donations.map(don => {
      const gc = giftCards.find(g => g.id === don.giftCardId);
    return {
      donation: don,
      giftCard: gc!
    }
    }).reverse(); // Latest first
  },

  getGiftCardsByFamily: async (familyId: string): Promise<GiftCard[]> => {
    await randomDelay(200, 400);
    donationService.initDB();
    const giftCards = storage.get<GiftCard[]>(GIFTCARDS_KEY, mockGiftCards);
    return giftCards
      .filter((g) => g.familyId === familyId)
      .map((g) => normalizeGiftCard(g))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getActiveGiftForFamily: async (familyId: string): Promise<GiftCard | null> => {
    const cards = await donationService.getGiftCardsByFamily(familyId);
    const active = cards.find((c) => c.status === 'sent' || c.status === 'generated' || c.status === 'delivered');
    return active ?? cards[0] ?? null;
  },

  createBigDonation: async (payload: {
    totalAmount: number;
    communityId: string;
    donorId: string;
  }): Promise<BigDonationResult> => {
    try {
      const response = await donationsApi.createRegionalDonation(payload.communityId, payload.totalAmount);
      if (response && response.donations) {
        return {
          ...response,
          supportTierDesc: response.impactedFamiliesCount > 2 ? 'Apoio Regional Ampliado' : 'Apoio Extraordinário Focado'
        };
      }
    } catch (e) {
      handleApiError(e, 'Create Big Donation');
    }

    await randomDelay(1000, 2000);
    donationService.initDB();

    // Find eligible families
    const families = await familyService.getFamiliesByCommunity(payload.communityId);
    const eligibleFamilies = families.filter(f => f.supportStatus === 'needs_help');

    if (eligibleFamilies.length === 0) {
      throw new Error('Nenhuma família carente no momento nesta região.');
    }

    // Distribute equally (in reality, it amplifies support if less families)
    const perFamilyAmount = Math.floor(payload.totalAmount / eligibleFamilies.length);
    
    const donations: Donation[] = [];
    const giftCards: GiftCard[] = [];
    const familyIds: string[] = [];

    for (const family of eligibleFamilies) {
      const gc = await donationService.generateGiftCard({
        amount: perFamilyAmount,
        familyId: family.id,
        donorId: payload.donorId,
        donationId: `bigdon-${Date.now()}-${family.id}`
      });

      const don: Donation = {
        id: `bigdon-${Date.now()}-${family.id}`,
        donorId: payload.donorId,
        familyId: family.id,
        communityId: payload.communityId,
        amount: perFamilyAmount,
        giftCardId: gc.id,
        createdAt: new Date().toISOString(),
        message: 'Apoio Regional Ampliado'
      };

      const dones = storage.get<Donation[]>(DONATIONS_KEY, mockDonations);
      dones.push(don);
      storage.set(DONATIONS_KEY, dones);

      donations.push(don);
      giftCards.push(gc);
      familyIds.push(family.id);

      // Update Status
      await familyService.updateFamilyStatus(family.id, 'supported');
    }

    // Update user global total
    const USERS_KEY = 'users_db';
    const sessionUser = storage.get<any>('current_user', null);
    if (sessionUser && sessionUser.id === payload.donorId) {
       sessionUser.totalDonated += payload.totalAmount;
       storage.set('current_user', sessionUser);
       const users = storage.get<any[]>(USERS_KEY, []);
       const idx = users.findIndex(u => u.id === sessionUser.id);
       if (idx !== -1) {
          users[idx].totalDonated += payload.totalAmount;
          storage.set(USERS_KEY, users);
       }
    }

    let supportTierDesc = 'Apoio Massivo Distribuído';
    if (eligibleFamilies.length <= 2 && payload.totalAmount > 200) {
      supportTierDesc = 'Apoio Extraordinário Focado';
    }

    return {
      communityId: payload.communityId,
      totalDistributedAmount: payload.totalAmount,
      impactedFamiliesCount: eligibleFamilies.length,
      familyIds,
      donations,
      giftCards,
      supportTierDesc
    };
  }
};
