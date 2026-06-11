import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { MockDatabase } from '../../database/mock-db';
import { buildCarouselDonors, mapUserToCarouselDonor } from '../../shared/utils/featuredDonors';
import { formatUser } from '../auth/auth.service';
import { UserRole } from '@prisma/client';

export type FeaturedDonorsConfig = {
  donorIds: string[];
  updatedAt?: string;
  updatedBy?: string;
};

export class FeaturedDonorsService {
  private static async readConfig(): Promise<FeaturedDonorsConfig> {
    if (env.DATABASE_MODE === 'prisma') {
      const highlights = await prisma.highlight.findMany({
        where: { title: 'featured-donor' },
        orderBy: { order: 'asc' },
      });
      return {
        donorIds: highlights.map(h => h.userId).filter(Boolean) as string[],
      };
    } else {
      const raw = await MockDatabase.read<FeaturedDonorsConfig>('featured-donors');
      if (Array.isArray(raw)) {
        return { donorIds: raw as unknown as string[] };
      }
      return raw?.donorIds ? raw : { donorIds: [] };
    }
  }

  static async getConfig(): Promise<FeaturedDonorsConfig> {
    return this.readConfig();
  }

  static async saveConfig(donorIds: string[], adminUserId?: string): Promise<FeaturedDonorsConfig> {
    if (env.DATABASE_MODE === 'prisma') {
      // Fetch pool of eligible donors to validate
      const dbUsers = await prisma.user.findMany({
        where: { role: UserRole.DONOR },
        include: { donorProfile: true },
      });
      
      const pool = dbUsers.map(formatUser).map(mapUserToCarouselDonor).filter(Boolean);
      const validIds = new Set(pool.map((d: any) => d.id));
      const cleaned = donorIds.filter((id) => validIds.has(id)).slice(0, 20);

      // Clean existing featured donors in db
      await prisma.highlight.deleteMany({
        where: { title: 'featured-donor' },
      });

      // Insert new highlights
      await prisma.highlight.createMany({
        data: cleaned.map((userId, index) => ({
          userId,
          title: 'featured-donor',
          order: index,
        })),
      });

      if (adminUserId) {
        await prisma.auditLog.create({
          data: {
            userId: adminUserId,
            action: 'UPDATE_FEATURED_DONORS',
            entityType: 'HIGHLIGHT',
            entityId: adminUserId,
            newValue: JSON.stringify(cleaned),
          },
        });
      }

      return {
        donorIds: cleaned,
        updatedAt: new Date().toISOString(),
        updatedBy: adminUserId,
      };
    } else {
      const users = await MockDatabase.read<any>('users');
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
  }

  static async listDonorsForPicker(): Promise<any[]> {
    if (env.DATABASE_MODE === 'prisma') {
      const dbUsers = await prisma.user.findMany({
        where: { role: UserRole.DONOR },
        include: { donorProfile: true },
      });

      return dbUsers
        .map(formatUser)
        .map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          totalDonated: u.totalDonated ?? 0,
          instagram: u.instagram,
          privacySettings: u.privacySettings,
        }))
        .sort((a, b) => b.totalDonated - a.totalDonated);
    } else {
      const users = await MockDatabase.read<any>('users');
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
  }

  static async getRankingWithFeatured(): Promise<any[]> {
    if (env.DATABASE_MODE === 'prisma') {
      const dbUsers = await prisma.user.findMany({
        where: { role: UserRole.DONOR },
        include: { donorProfile: true },
      });
      const pool = dbUsers.map(formatUser).map(mapUserToCarouselDonor).filter(Boolean) as any[];
      const config = await this.readConfig();
      return buildCarouselDonors(pool, config.donorIds);
    } else {
      const users = await MockDatabase.read<any>('users');
      const pool = users.map(mapUserToCarouselDonor).filter(Boolean) as any[];
      const config = await this.readConfig();
      return buildCarouselDonors(pool, config.donorIds);
    }
  }
}
