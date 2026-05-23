import { apiRequest } from './apiClient';

export const donationsApi = {
  createDonation: (data: {
    familyId: string;
    amount: number;
    message?: string;
    communityId?: string;
  }) => apiRequest('/donations', 'POST', data),
  createBatchDonation: (familyIds: string[], amountPerFamily?: number) =>
    apiRequest('/donations/batch', 'POST', { familyIds, amountPerFamily }),
  createRegionalDonation: (communityId: string, totalAmount: number) => apiRequest('/donations/regional', 'POST', { communityId, totalAmount }),
  getMyDonations: () => apiRequest('/donations/me', 'GET'),
};
