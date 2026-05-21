export const FEATURED_DONORS_MAX = 20;

export interface FeaturedDonorsConfig {
  donorIds: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export type CarouselDonor = {
  id: string;
  name: string;
  totalDonated: number;
  avatar?: string;
  instagram?: string;
  facebook?: string;
  isAnonymous?: boolean;
  privacySettings?: {
    showOnRanking: boolean;
    showInstagram: boolean;
    anonymousMode: boolean;
  };
};
