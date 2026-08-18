import type { Donation, GiftCard } from '../types';

export const mockDonations: Donation[] = [
  {
    id: 'don-1',
    donorId: 'u-12345',
    familyId: 'f4',
    communityId: 'c2',
    amount: 40,
    giftCardId: 'gc-1',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    message: 'Vocês não estão sozinhos.'
  },
  {
    id: 'don-2',
    donorId: 'u-12345',
    familyId: 'f4',
    communityId: 'c2',
    amount: 90,
    giftCardId: 'gc-2',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

export const mockGiftCards: GiftCard[] = [
  {
    id: 'gc-1',
    familyId: 'f4',
    donorId: 'u-12345',
    donationId: 'don-1',
    amount: 40,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'redeemed',
    label: 'Vale iFood - R$40',
    provider: 'ifood',
    code: 'IFOOD-ABC1-2300'
  },
  {
    id: 'gc-2',
    familyId: 'f4',
    donorId: 'u-12345',
    donationId: 'don-2',
    amount: 90,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'redeemed',
    label: 'Vale Carrefour - R$90',
    provider: 'carrefour',
    code: 'CRFR-XYZ7-8900'
  }
]
