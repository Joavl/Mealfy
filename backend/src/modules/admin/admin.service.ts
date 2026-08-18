import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { createAuditLog } from '../auditLogs/auditLog.service';
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
  const entity = await prisma.entity.findUnique({ where: { id: entityId } });
  if (!entity) throw new AppError('Entidade não encontrada', 404, 'entity_not_found');

  const updated = await prisma.entity.update({ where: { id: entityId }, data: { status } });
  // Mantém o status do usuário coerente quando bloqueado.
  if (status === 'blocked') {
    await prisma.user.update({ where: { id: entity.userId }, data: { status: 'blocked' } });
  } else if (status === 'active') {
    await prisma.user.update({ where: { id: entity.userId }, data: { status: 'active' } });
  }

  await createAuditLog({ actorUserId, action, entityType: 'entity', entityId });
  return updated;
}
