export type UrgencyColor = 'error' | 'warning' | 'success';
export type SupportStatus = 'needs_help' | 'supported' | 'fed' | 'pending' | 'rejected' | 'suspended' | 'approved';
export type GiftCardStatus = 'generated' | 'sent' | 'delivered' | 'used' | 'redeemed';
export type EntityType = 'ONG' | 'igreja' | 'escola' | 'instituto';
export type EntityStatus = 'pending' | 'approved' | 'rejected';

export interface PrivacySettings {
  showOnRanking: boolean;
  showInstagram: boolean;
  anonymousMode: boolean;
}

export type UserRole = 'donor' | 'entity' | 'beneficiary' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  documentType?: 'cpf' | 'cnpj';
  documentNumber?: string;
  avatar?: string;
  instagram?: string;
  facebook?: string;
  totalDonated: number;
  rankingPosition: number;
  rankingPercentile: string;
  favoriteCommunityId?: string;
  privacySettings?: PrivacySettings;
  impactPreferences?: {
    preferredRegion?: string;
    preferredCommunityId?: string;
    preferredRadiusKm?: number;
  };
  entityId?: string; // If role is entity
  beneficiaryId?: string; // If role is beneficiary
  status?: 'pending' | 'approved' | 'rejected' | 'active' | 'suspended';
}

export interface AuthorizingEntity {
  id: string;
  name: string;
  cnpj: string;
  type: EntityType;
  responsibleName: string;
  responsibleRole?: string;
  email: string;
  phone: string;
  region: string;
  addressOrDistrict?: string;
  websiteOrInstagram?: string;
  shortDescription?: string;
  status: EntityStatus;
  createdAt: string;
}

export interface Community {
  id: string;
  name: string;
  region: string;
  description: string;
  distance: string;
  familiesTotal: number;
  familiesInNeed: number;
  priority: string;
  urgencyColor: UrgencyColor;
  imageUrl?: string;
}

export interface Child {
  id: string;
  name: string;
  age: number;
  school: string;
  grade?: string;
  isPWD?: boolean; // Person with Disability
}

export interface Family {
  id: string;
  communityId: string;
  representativeName: string;
  neighborhood: string;
  city: string;
  state: string;
  shortAddress: string;
  description: string;
  childrenCount: number;
  children: Child[];
  mainNeed: string;
  supportStatus: SupportStatus;
  distanceToUser: string;
  priorityLevel: number; // 1 to 5 (highest)
  latitude: number;
  longitude: number;
  photoUrl?: string;
  authorizingEntityId?: string; // If registered by an entity
  createdByEntityId?: string;
  sourceType?: 'entity' | 'donor_indication';
  sourceEntityName?: string;
  sourceLabel?: string;
  originalIndicationId?: string;
  lastFedAt?: string; // Timestamp of last donation
  status?: SupportStatus; // Added for compatibility
}

export interface DonorIndication {
  id: string;
  representativeName: string;
  region: string;
  childrenCount: number;
  observation: string;
  contact?: string;
  indicatedByUserId: string;
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  createdAt: string;
}

export interface GiftCard {
  id: string;
  familyId: string;
  donorId: string;
  donationId: string;
  amount: number;
  createdAt: string;
  status: GiftCardStatus;
  label: string;
  provider: 'ifood' | 'other' | string;
  code: string;
}

export interface Donation {
  id: string;
  donorId: string;
  familyId: string;
  communityId: string;
  amount: number;
  giftCardId: string;
  createdAt: string;
  message?: string;
  isBatch?: boolean;
}

export interface Recurrence {
  id: string;
  userId: string;
  communityId?: string; 
  familyId?: string; 
  amount: number;
  periodicity: 'daily' | 'weekly' | 'monthly';
  status: 'active' | 'paused';
  nextBillingDate: string;
  totalAccumulated: number;
}

export interface BigDonationResult {
  communityId: string;
  totalDistributedAmount: number;
  impactedFamiliesCount: number;
  familyIds: string[];
  donations: Donation[];
  giftCards: GiftCard[];
  supportTierDesc: string;
}
