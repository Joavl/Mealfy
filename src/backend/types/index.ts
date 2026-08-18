export type UrgencyColor = 'error' | 'warning' | 'success';
export type SupportStatus = 'needs_help' | 'supported' | 'fed' | 'pending' | 'rejected' | 'suspended' | 'approved';
export type GiftCardStatus = 'generated' | 'delivered' | 'used' | 'redeemed';
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
  personalMessage?: string;
  totalDonated: number;
  rankingPosition: number;
  rankingPercentile: string;
  favoriteCommunityId?: string;
  /** IDs das famílias marcadas como "salvas" pelo usuário (Mapa) */
  savedFamilyIds?: string[];
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

// Perfil público de doador, exibido no carrossel da Home, no ranking e em /profile/:id
export interface PublicDonorProfile {
  id: string;
  name: string;
  avatar: string;
  totalDonated: number;
  rankingPosition: number;
  instagram?: string;
  personalMessage?: string;
  supportsCount: number;
  focusRegion?: string;
  isAnonymous?: boolean;
  privacySettings?: PrivacySettings;
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
  relationship?: string; // Parentesco com o responsável (filho(a), neto(a), etc.)
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
  /** Plataforma de vale-alimentação escolhida pela família beneficiária */
  preferredGiftCardProvider?: GiftCardProvider;
  /** Dados da última doação recebida (rastreabilidade da regra diária) */
  lastDonationId?: string;
  lastGiftCardProvider?: GiftCardProvider;
  lastGiftCardCode?: string;
  /** Quem alimentou a família por último (exibido em "Alimentada por") */
  lastFedByName?: string;
  lastFedByInstagram?: string;
  lastFedByAvatar?: string;
  /** Validação de identidade/dados (governo) — separado da aprovação */
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'blocked';
  /** Aprovação final no Mealfy (manual pela entidade/admin) */
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  /** Origem dos dados: validado pelo governo ou informado manualmente */
  dataSource?: 'gov' | 'manual';
  /** ── Localização segura (doador vê aproximado; endereço completo é sensível) ── */
  community?: string;        // Nome da comunidade (ex.: "Rocinha")
  zone?: string;             // Zona/região (ex.: "Zona Sul")
  approximateAddress?: string; // Endereço aproximado (sem número/complemento)
  referencePoint?: string;   // Ponto de referência público
  nis?: string;              // NIS (exibido mascarado na ficha)
  incomeApprox?: string;     // Renda aproximada (opcional)
  vulnerabilities?: string[];// PCD, mãe solo, moradia precária, etc.
}

/** Provedores oficiais de vale-alimentação (padrão único do app). */
export type GiftCardProvider = 'ifood' | '99' | 'carrefour';

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
