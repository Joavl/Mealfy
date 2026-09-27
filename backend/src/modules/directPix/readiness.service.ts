import { prisma } from '../../database/prisma';

export type DirectPixReadinessBlocker = 'email_not_verified';

export async function getDirectPixReadiness(userId: string): Promise<{ ready: boolean; blockers: DirectPixReadinessBlocker[] }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
  const blockers: DirectPixReadinessBlocker[] = [];
  if (!user?.emailVerifiedAt) blockers.push('email_not_verified');
  return { ready: blockers.length === 0, blockers };
}
