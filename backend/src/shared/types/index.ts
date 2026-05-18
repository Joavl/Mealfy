export type UserRole = 'donor' | 'entity' | 'beneficiary' | 'admin';
export type SupportStatus = 'needs_help' | 'supported' | 'fed' | 'pending' | 'rejected' | 'suspended';
export type FamilyStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type EntityStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: 'pending' | 'approved' | 'rejected' | 'active';
  entityId?: string;
  beneficiaryId?: string;
  phone?: string;
  documentType?: 'cpf' | 'cnpj';
  documentNumber?: string;
  totalDonated: number;
  privacySettings?: {
    showOnRanking: boolean;
    showInstagram: boolean;
    anonymousMode: boolean;
  };
  impactPreferences?: {
    preferredRegion?: string;
    preferredCommunityId?: string;
    preferredRadiusKm?: number;
  };
}

export interface Family {
  id: string;
  representativeName: string;
  region: string;
  communityId?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  childrenCount: number;
  status: FamilyStatus;
  supportStatus: SupportStatus;
  lastFedAt?: string;
  createdByEntityId?: string;
  sourceType: 'entity' | 'donor_indication';
  sourceLabel: string;
  originalIndicationId?: string;
  latitude: number;
  longitude: number;
}

export interface DonorIndication {
  id: string;
  representativeName: string;
  region: string;
  childrenCount: number;
  observation: string;
  indicatedByUserId: string;
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  createdAt: string;
}

export interface Donation {
  id: string;
  donorId: string;
  familyId: string;
  amount: number;
  createdAt: string;
}

export interface GiftCard {
  id: string;
  donationId: string;
  provider: 'ifood' | 'other';
  code: string;
  amount: number;
  status: 'generated' | 'delivered' | 'used';
  createdAt: string;
}
