import { apiRequest } from './apiClient';
import type { GiftCard } from '../backend/types';

export type IfoodIntegrationInfo = {
  provider: string;
  partnerName: string;
  redeemInstructions: string;
  redeemDeepLink: string;
  walletPath: string;
};

export const giftcardsApi = {
  getIfoodInfo: (code?: string) =>
    apiRequest<IfoodIntegrationInfo>(`/giftcards/ifood/info${code ? `?code=${encodeURIComponent(code)}` : ''}`, 'GET'),

  listByFamily: (familyId: string) =>
    apiRequest<GiftCard[]>(`/giftcards/family/${familyId}`, 'GET'),

  getActiveForFamily: (familyId: string) =>
    apiRequest<GiftCard | null>(`/giftcards/family/${familyId}/active`, 'GET'),

  redeem: (giftCardId: string) =>
    apiRequest<{ giftCard: GiftCard; ifood: IfoodIntegrationInfo }>(
      `/giftcards/${giftCardId}/redeem`,
      'POST',
    ),
};
