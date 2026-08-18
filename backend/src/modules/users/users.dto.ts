import type { User } from '@prisma/client';

/**
 * Serialização segura do usuário — NUNCA inclui passwordHash.
 * Usado em /auth (register/login) e em /me.
 */
export function toPublicUser(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl,
    instagram: u.instagram,
    phone: u.phone,
    status: u.status,
    privacySettings: {
      showOnRanking: u.showOnRanking,
      showInstagram: u.showInstagram,
      anonymousMode: u.anonymousMode,
    },
    createdAt: u.createdAt,
  };
}

export type PublicUser = ReturnType<typeof toPublicUser>;
