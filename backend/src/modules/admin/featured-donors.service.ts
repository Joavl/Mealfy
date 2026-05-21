import { MockDatabase } from '../../database/mock-db';
import { AppError } from '../../shared/errors/AppError';
import { User } from '../../shared/types';
import { buildCarouselDonors, mapUserToCarouselDonor } from '../../shared/utils/featuredDonors';

export type FeaturedDonorsConfig = {
  donorIds: string[];
  updatedAt?: string;
  updatedBy?: string;
};

export class FeaturedDonorsService {
  private static async readConfig(): Promise<FeaturedDonorsConfig> {
    const raw = await MockDatabase.read<FeaturedDonorsConfig>('featured-donors');
    if (Array.isArray(raw)) {
      return { donorIds: raw as unknown as string[] };
    }
    return raw?.donorIds ? raw : { donorIds: [] };
  }

  static async getConfig(): Promise<FeaturedDonorsConfig> {
    return this.readConfig();
  }

  static async saveConfig(donorIds: string[], adminUserId?: string): Promise<FeaturedDonorsConfig> {
    const users = await MockDatabase.read<User>('users');
    const pool = users.map(mapUserToCarouselDonor).filter(Boolean);
    const validIds = new Set(pool.map((d: any) => d.id));

    const cleaned = donorIds.filter((id) => validIds.has(id)).slice(0, 20);
    const config: FeaturedDonorsConfig = {
      donorIds: cleaned,
      updatedAt: new Date().toISOString(),
      updatedBy: adminUserId,
    };

    await MockDatabase.write('featured-donors', config);
    await MockDatabase.appendAuditLog({
      type: 'UPDATE_FEATURED_DONORS',
      donorIds: cleaned,
      adminUserId,
    });

    return config;
  }

  static async listDonorsForPicker(): Promise<any[]> {
    const users = await MockDatabase.read<User>('users');
    return users
      .filter((u) => u.role === 'donor')
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        totalDonated: u.totalDonated ?? 0,
        instagram: (u as any).instagram,
        privacySettings: u.privacySettings,
      }))
      .sort((a, b) => b.totalDonated - a.totalDonated);
  }

  static async getRankingWithFeatured(): Promise<any[]> {
    const users = await MockDatabase.read<User>('users');
    const pool = users.map(mapUserToCarouselDonor).filter(Boolean) as any[];
    const config = await this.readConfig();
    return buildCarouselDonors(pool, config.donorIds);
  }
}
