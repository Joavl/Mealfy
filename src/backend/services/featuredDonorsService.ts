import type { FeaturedDonorsConfig } from '../types/featuredDonors';
import { FEATURED_DONORS_MAX } from '../types/featuredDonors';
import type { CarouselDonor } from '../types/featuredDonors';
import { buildCarouselDonors, donorToCarouselEntry } from '../utils/featuredDonors';
import { storage } from '../utils/storage';
import { randomDelay } from '../utils/delay';
import { adminApi } from '../../api/adminApi';
import { handleApiError } from '../utils/fallback';
import { mockUsers } from '../mockData/users';

const FEATURED_KEY = 'featured_donors_carousel_v1';

const MOCK_CAROUSEL_POOL: CarouselDonor[] = [
  { id: 'u-1', name: 'Marina R.', totalDonated: 12500, avatar: 'M', instagram: '@marina.rm', facebook: 'marina.rm', privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false } },
  { id: 'u-2', name: 'Carlos S.', totalDonated: 9400, avatar: 'C', instagram: '@csilva', facebook: 'csilva.oficial', privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false } },
  { id: 'u-3', name: 'Doador Solidário', totalDonated: 8200, avatar: 'D', isAnonymous: true, privacySettings: { showOnRanking: true, showInstagram: false, anonymousMode: true } },
  { id: 'u-4', name: 'João H.', totalDonated: 5100, avatar: 'J', instagram: '@joao_he', privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false } },
  { id: 'u-5', name: 'Alessandra M.', totalDonated: 4050, avatar: 'A', instagram: '@ale_mm', privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false } },
  { id: 'u-6', name: 'Pedro L.', totalDonated: 3200, avatar: 'P', instagram: '@pedro.l', privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false } },
  { id: 'u-7', name: 'Fernanda K.', totalDonated: 2800, avatar: 'F', instagram: '@fe.k', privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false } },
  { id: 'u-8', name: 'Ricardo M.', totalDonated: 2100, avatar: 'R', privacySettings: { showOnRanking: true, showInstagram: false, anonymousMode: false } },
];

function getLocalPool(): CarouselDonor[] {
  const users = storage.get<Record<string, unknown>[]>( 'users_db', mockUsers as unknown as Record<string, unknown>[]);
  const fromUsers = users
    .map(donorToCarouselEntry)
    .filter((d): d is CarouselDonor => d !== null);

  const byId = new Map<string, CarouselDonor>();
  [...MOCK_CAROUSEL_POOL, ...fromUsers].forEach((d) => byId.set(d.id, d));
  return Array.from(byId.values()).sort((a, b) => b.totalDonated - a.totalDonated);
}

export const featuredDonorsService = {
  getConfig: async (): Promise<FeaturedDonorsConfig> => {
    try {
      const remote = await adminApi.getFeaturedDonors();
      if (remote?.donorIds) {
        storage.set(FEATURED_KEY, remote);
        return remote;
      }
    } catch (e) {
      handleApiError(e, 'Get Featured Donors Config');
    }
    await randomDelay(100, 200);
    return storage.get<FeaturedDonorsConfig>(FEATURED_KEY, { donorIds: [] });
  },

  saveConfig: async (donorIds: string[], updatedBy?: string): Promise<FeaturedDonorsConfig> => {
    const trimmed = donorIds.slice(0, FEATURED_DONORS_MAX);
    const config: FeaturedDonorsConfig = {
      donorIds: trimmed,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    try {
      const saved = await adminApi.saveFeaturedDonors(trimmed);
      if (saved) {
        storage.set(FEATURED_KEY, saved);
        return saved;
      }
    } catch (e) {
      handleApiError(e, 'Save Featured Donors');
    }

    await randomDelay(200, 400);
    storage.set(FEATURED_KEY, config);
    return config;
  },

  getDonorPool: async (): Promise<CarouselDonor[]> => {
    try {
      const remote = await adminApi.listDonorsForFeatured();
      if (remote?.length) return remote;
    } catch (e) {
      handleApiError(e, 'List Donors For Featured');
    }
    return getLocalPool();
  },

  getCarouselDonors: async (): Promise<CarouselDonor[]> => {
    const [config, pool] = await Promise.all([
      featuredDonorsService.getConfig(),
      featuredDonorsService.getDonorPool(),
    ]);
    return buildCarouselDonors(pool, config.donorIds);
  },
};

export { buildCarouselDonors, getLocalPool };
