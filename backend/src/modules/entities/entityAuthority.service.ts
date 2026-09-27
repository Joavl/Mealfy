import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';

export const ENTITY_OPERATOR_PERMISSIONS = [
  'operators.manage',
  'families.read',
  'families.write',
  'pix.submit',
  'pix.review',
  'pix.follow_up',
  'audit.read',
] as const;
export type EntityOperatorPermission = typeof ENTITY_OPERATOR_PERMISSIONS[number];
export const OWNER_PERMISSIONS: EntityOperatorPermission[] = [...ENTITY_OPERATOR_PERMISSIONS];

type DbClient = PrismaClient | Prisma.TransactionClient;

export type EntityAuthority = {
  membershipId: string;
  entityId: string;
  userId: string;
  permissions: string[];
};

/** Resolves entity authority exclusively from the authenticated user and current database state. */
export async function resolveEntityAuthority(
  userId: string,
  requiredPermission?: EntityOperatorPermission,
  db: DbClient = prisma,
): Promise<EntityAuthority> {
  const memberships = await db.entityOperatorMembership.findMany({
    where: { userId, status: 'active', entity: { status: 'active' } },
    select: { id: true, entityId: true, userId: true, permissions: true },
    take: 2,
  });
  if (memberships.length > 1) {
    throw new AppError('Autoridade operacional ambígua.', 403, 'entity_authority_ambiguous');
  }
  const membership = memberships[0];
  // Existing installations are backfilled by the migration. Runtime fallback
  // would let a suspended/revoked legacy owner silently regain authority.
  if (!membership) throw new AppError('Autoridade operacional indisponível.', 403, 'entity_authority_inactive');
  if (requiredPermission && !membership.permissions.includes(requiredPermission)) {
    throw new AppError('Permissão insuficiente.', 403, 'insufficient_entity_permission');
  }
  return { membershipId: membership.id, entityId: membership.entityId, userId, permissions: membership.permissions };
}
