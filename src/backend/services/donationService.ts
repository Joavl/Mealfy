import type { Donation, GiftCard, Family, BigDonationResult, GiftCardProvider } from '../types';
import { mockDonations, mockGiftCards } from '../mockData/donations';
import { familyService } from './familyService';
import { giftCardService } from './giftCardService';
import { PROVIDER_LABELS } from '../mockData/giftCardInventory';
import { isBeneficiaryEligible } from '../utils/timeUtils';
import { storage } from '../utils/storage';
import { randomDelay } from '../utils/delay';

import { donationsApi } from '../../api/donationsApi';
import { handleApiError } from '../utils/fallback';

/** Resolve o provider da família (padrão iFood se não definido). */
const resolveProvider = (family?: Family): GiftCardProvider =>
  (family?.preferredGiftCardProvider as GiftCardProvider) || 'ifood';

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

  generateGiftCard: async (payload: { amount: number, familyId: string, donorId: string, donationId: string, provider: GiftCardProvider }): Promise<GiftCard> => {
    await randomDelay(200, 500);
    donationService.initDB();
    giftCardService.initInventory();

    // Libera um código real do estoque do provider escolhido pela família.
    // Lança erro ("Sem códigos disponíveis para ...") se o estoque acabar.
    const released = giftCardService.releaseCode(payload.provider);

    const newGiftCard: GiftCard = {
      id: `gc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      familyId: payload.familyId,
      donorId: payload.donorId,
      donationId: payload.donationId,
      amount: payload.amount,
      createdAt: new Date().toISOString(),
      status: 'generated',
      label: `Vale ${PROVIDER_LABELS[payload.provider]} — R$${payload.amount}`,
      provider: payload.provider,
      code: released.code
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
  }): Promise<{ donation: Donation, giftCard: GiftCard | null, familyAssigned: Family, payment?: any }> => {
    if (payload.familyId) {
      try {
        // Contrato real: cria intenção + cobrança Pix. O vale NÃO é liberado aqui —
        // só após o pagamento confirmar (webhook). `giftCard` vem null nesta fase.
        const response = await donationsApi.createDonation({ familyId: payload.familyId, amount: payload.amount });
        if (response && response.donation) {
          return {
            donation: response.donation,
            giftCard: null,
            payment: response.payment,
            familyAssigned: { id: payload.familyId } as any // Simplified for callback
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

    // ── Regra crítica: 1 doação por dia por família ──
    if (!isBeneficiaryEligible(selectedFamily!)) {
      throw new Error('Esta família já foi alimentada hoje. Próxima liberação às 08h.');
    }

    // Generate Gift Card
    const donorId = payload.donorId || `anon-${Date.now()}`;
    const donationId = `don-${Date.now()}`;

    const giftCard = await donationService.generateGiftCard({
      amount: payload.amount,
      familyId: selectedFamily!.id,
      donorId,
      donationId,
      provider: resolveProvider(selectedFamily)
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

    // Marca a família como alimentada hoje (persistido — bloqueia nova doação no dia)
    const familyAssigned = (await familyService.markFamilyFed(selectedFamily!.id, {
      donationId,
      provider: giftCard.provider as Family['lastGiftCardProvider'],
      code: giftCard.code,
    })) || selectedFamily!;

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
      const fam = await familyService.getFamilyById(familyId);
      if (fam && !isBeneficiaryEligible(fam)) continue; // pula famílias já alimentadas hoje
      const donationId = `don-batch-${Date.now()}-${familyId}`;
      const gc = await donationService.generateGiftCard({
        amount: payload.amountPerFamily,
        familyId,
        donorId: payload.donorId,
        donationId,
        provider: resolveProvider(fam || undefined)
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

      // Marca a família como alimentada hoje (persistido)
      await familyService.markFamilyFed(familyId, {
        donationId,
        provider: gc.provider as Family['lastGiftCardProvider'],
        code: gc.code,
      });
    }

    return { donations, giftCards };
  },

  getDonationHistoryByUser: async (userId: string): Promise<{donation: Donation, giftCard: GiftCard | null}[]> => {
    try {
      // Contrato real: GET /me/donations → { donations: [dtoDonor] }.
      // O DTO do doador NUNCA traz o código do vale (por design) — giftCard vem null.
      const history = await donationsApi.getMyDonations();
      if (history && Array.isArray(history.donations)) {
        return history.donations.map((dto: any) => ({
          // O backend trabalha em CENTAVOS e a UI exibe em reais. Normalizar aqui
          // (e não em cada tela) evita que uma doação de R$ 25,00 apareça como
          // "R$ 2500" — era o que acontecia em Profile e BeneficiaryDashboard.
          donation: { ...dto, amount: (dto.amount ?? 0) / 100 },
          giftCard: dto.giftCard ?? null
        }));
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
        donationId: `bigdon-${Date.now()}-${family.id}`,
        provider: resolveProvider(family)
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

      // Marca a família como alimentada hoje (persistido)
      await familyService.markFamilyFed(family.id, {
        donationId: don.id,
        provider: gc.provider as Family['lastGiftCardProvider'],
        code: gc.code,
      });
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
