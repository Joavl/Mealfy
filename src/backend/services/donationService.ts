import type { BigDonationResult, Donation, Family, GiftCard } from '../types';
import { donationsApi } from '../../api/donationsApi';

/**
 * Adapter financeiro sem persistência local. Doações, vales e famílias atendidas
 * são estados autoritativos do backend e jamais podem ser simulados no cliente.
 */
export const donationService = {
  async createDonation(payload: {
    amount: number;
    communityId: string;
    donorId?: string;
    familyId?: string;
    message?: string;
  }): Promise<{ donation: Donation; giftCard: GiftCard | null; familyAssigned: Family; payment?: unknown }> {
    if (!payload.familyId) {
      throw new Error('Doações coletivas exigem uma operação de pagamento implementada no servidor.');
    }

    const response = await donationsApi.createDonation({
      familyId: payload.familyId,
      amount: payload.amount,
    });
    if (!response?.donation || !response?.payment) {
      throw new Error('A operação não retornou uma cobrança válida.');
    }

    return {
      donation: response.donation as Donation,
      giftCard: null,
      payment: response.payment,
      familyAssigned: { id: payload.familyId } as Family,
    };
  },

  async createBatchDonation(_payload: {
    familyIds: string[];
    amountPerFamily: number;
    donorId: string;
    communityId: string;
  }): Promise<{ donations: Donation[]; giftCards: GiftCard[] }> {
    throw new Error('Doações em lote ainda não possuem fluxo de pagamento autoritativo.');
  },

  async createBigDonation(_payload: {
    totalAmount: number;
    communityId: string;
    donorId: string;
  }): Promise<BigDonationResult> {
    throw new Error('Doações regionais ainda não possuem fluxo de pagamento autoritativo.');
  },

  async getDonationHistoryByUser(_userId: string): Promise<{ donation: Donation; giftCard: GiftCard | null }[]> {
    const history = await donationsApi.getMyDonations();
    if (!history || !Array.isArray(history.donations)) return [];
    return history.donations.map((dto: any) => ({
      donation: { ...dto, amount: (dto.amount ?? 0) / 100 } as Donation,
      giftCard: null,
    }));
  },
};
