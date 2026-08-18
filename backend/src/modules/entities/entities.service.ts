import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';

export async function getEntityForUser(userId: string) {
  const entity = await prisma.entity.findUnique({ where: { userId } });
  if (!entity) throw new AppError('Perfil de entidade não encontrado', 403, 'no_entity_profile');
  return entity;
}

export async function getDashboard(userId: string) {
  const entity = await getEntityForUser(userId);
  const grouped = await prisma.family.groupBy({
    by: ['approvalStatus'],
    where: { entityId: entity.id },
    _count: true,
  });
  const total = await prisma.family.count({ where: { entityId: entity.id } });

  return {
    entity: { id: entity.id, name: entity.name, status: entity.status },
    families: {
      total,
      byStatus: grouped.map((g) => ({ status: g.approvalStatus, count: g._count })),
    },
  };
}
