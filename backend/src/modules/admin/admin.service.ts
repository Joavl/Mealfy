import { prisma } from '../../database/prisma';
import { listOperatorsForAdmin } from '../entities/operators.service';
export { listOperatorsForAdmin };
import { AppError } from '../../shared/errors/AppError';
import type { UserStatus } from '@prisma/client';

/** Lista entidades para moderação (admin). Inclui status da conta do usuário. */
export async function listEntities() {
  const entities = await prisma.entity.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { status: true } } },
  });
  return entities.map((e) => ({
    id: e.id,
    name: e.name,
    cnpj: e.cnpj,
    responsibleName: e.responsibleName,
    email: e.email,
    phone: e.phone,
    status: e.status,
    userStatus: e.user.status,
    createdAt: e.createdAt,
  }));
}

/** Lista usuários para gestão (admin). NUNCA inclui passwordHash. */
export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
  return users;
}

/** Atualiza o status de uma entidade (aprovar/bloquear) e audita. */
export async function setEntityStatus(
  actorUserId: string,
  entityId: string,
  status: UserStatus,
  action: 'approve_entity' | 'block_entity',
) {
  return prisma.$transaction(async (tx) => {
    const entity = await tx.entity.findUnique({ where: { id: entityId } });
    if (!entity) throw new AppError('Entidade não encontrada', 404, 'entity_not_found');
    const updated = await tx.entity.update({ where: { id: entityId }, data: { status } });
    const memberships = await tx.entityOperatorMembership.findMany({ where: { entityId, status: 'active' }, select: { userId: true } });
    const operatorUserIds = [...new Set([entity.userId, ...memberships.map(({ userId }) => userId)])];
    if (status === 'blocked') {
      await tx.user.updateMany({ where: { id: { in: operatorUserIds } }, data: { sessionVersion: { increment: 1 } } });
      await tx.stepUpAuthorization.updateMany({ where: { userId: { in: operatorUserIds }, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await tx.user.update({ where: { id: entity.userId }, data: { status: status === 'blocked' ? 'blocked' : 'active' } });
    await tx.auditLog.create({ data: {
      actorUserId, actorRole: 'admin', action, entityType: 'entity', entityId, channel: 'web_pwa', result: status,
      metadata: { invalidatedOperatorSessions: status === 'blocked' ? operatorUserIds.length : 0 },
    } });
    return updated;
  });
}
