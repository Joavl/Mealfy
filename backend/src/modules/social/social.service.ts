import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { MockDatabase } from '../../database/mock-db';
import { AppError } from '../../shared/errors/AppError';
import { getMealfyFacebookUrl, toFacebookProfileUrl } from './social.utils';

export type SocialResolveResult = {
  platform: 'facebook';
  url: string;
  userId?: string;
  userName?: string;
  source: 'donor_profile' | 'mealfy_default';
};

export class SocialService {
  static getMealfyFacebookRedirect(): string {
    return getMealfyFacebookUrl();
  }

  static async resolveDonorFacebook(userId: string): Promise<SocialResolveResult> {
    if (env.DATABASE_MODE === 'prisma') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { donorProfile: true },
      });

      if (!user) {
        throw new AppError('Doador não encontrado', 404);
      }

      const isAnonymous = user.donorProfile?.anonymousMode ?? false;
      if (isAnonymous) {
        return {
          platform: 'facebook',
          url: getMealfyFacebookUrl(),
          userId,
          userName: 'Anônimo',
          source: 'mealfy_default',
        };
      }

      const fb = toFacebookProfileUrl(user.donorProfile?.facebook);
      if (fb) {
        return {
          platform: 'facebook',
          url: fb,
          userId: user.id,
          userName: user.name,
          source: 'donor_profile',
        };
      }

      return {
        platform: 'facebook',
        url: getMealfyFacebookUrl(),
        userId: user.id,
        userName: user.name,
        source: 'mealfy_default',
      };
    } else {
      const users = await MockDatabase.read<any>('users');
      const user = users.find((u) => u.id === userId);

      if (!user) {
        throw new AppError('Doador não encontrado', 404);
      }

      const isAnonymous = Boolean(user.privacySettings?.anonymousMode);
      if (isAnonymous) {
        return {
          platform: 'facebook',
          url: getMealfyFacebookUrl(),
          userId,
          userName: 'Anônimo',
          source: 'mealfy_default',
        };
      }

      const fb = toFacebookProfileUrl(user.facebook);
      if (fb) {
        return {
          platform: 'facebook',
          url: fb,
          userId: user.id,
          userName: user.name,
          source: 'donor_profile',
        };
      }

      return {
        platform: 'facebook',
        url: getMealfyFacebookUrl(),
        userId: user.id,
        userName: user.name,
        source: 'mealfy_default',
      };
    }
  }
}
