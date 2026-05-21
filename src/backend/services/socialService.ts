import { socialApi } from '../../api/socialApi';
import { handleApiError } from '../utils/fallback';
import { toFacebookProfileUrl } from './socialUtils';

const DEFAULT_MEALFY_FB = 'https://www.facebook.com/mealfy';

export const socialService = {
  getMealfyFacebookUrl: (): string => DEFAULT_MEALFY_FB,

  resolveDonorFacebook: async (donor: {
    id: string;
    name?: string;
    facebook?: string;
    isAnonymous?: boolean;
    privacySettings?: { anonymousMode?: boolean };
  }): Promise<string> => {
    if (donor.isAnonymous || donor.privacySettings?.anonymousMode) {
      return DEFAULT_MEALFY_FB;
    }

    const local = toFacebookProfileUrl(donor.facebook);
    if (local) return local;

    try {
      const res = await socialApi.resolveDonorFacebook(donor.id);
      if (res?.url) return res.url;
    } catch (e) {
      handleApiError(e, 'Resolve Donor Facebook');
    }

    return DEFAULT_MEALFY_FB;
  },

  /** Abre o Facebook do doador em nova aba (via redirect da API). */
  openDonorFacebook: async (donor: {
    id: string;
    facebook?: string;
    isAnonymous?: boolean;
    privacySettings?: { anonymousMode?: boolean };
  }): Promise<void> => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const url = `${base}/social/facebook/donor/${donor.id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  openMealfyFacebook: (): void => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.open(`${base}/social/facebook`, '_blank', 'noopener,noreferrer');
  },
};
