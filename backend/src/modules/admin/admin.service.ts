import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { MockDatabase } from '../../database/mock-db';
import { AppError } from '../../shared/errors/AppError';
import { UserRole, AccountStatus } from '@prisma/client';

export class AdminService {
  static async listPendingEntities(): Promise<any[]> {
    if (env.DATABASE_MODE === 'prisma') {
      const users = await prisma.user.findMany({
        where: {
          role: UserRole.ENTITY,
          status: AccountStatus.PENDING,
        },
        include: {
          organization: true,
        },
      });

      return users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: 'entity',
        status: 'pending',
        entityId: u.organizationId,
        entityData: u.organization ? {
          id: u.organization.id,
          name: u.organization.name,
          cnpj: u.organization.cnpj,
          type: u.organization.type.toLowerCase(),
          responsibleName: u.organization.responsibleName,
          email: u.organization.email,
          phone: u.organization.phone,
          region: u.organization.region,
          status: 'pending',
        } : null,
      }));
    } else {
      const users = await MockDatabase.read<any>('users');
      const entities = await MockDatabase.read<any>('entities');

      return users
        .filter(u => u.role === 'entity' && u.status === 'pending')
        .map(u => ({
          ...u,
          entityData: entities.find((e: any) => e.id === u.entityId)
        }));
    }
  }

  static async approveEntity(userId: string): Promise<void> {
    if (env.DATABASE_MODE === 'prisma') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) throw new AppError('User not found', 404);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { status: AccountStatus.APPROVED },
        }),
        user.organizationId ? prisma.organization.update({
          where: { id: user.organizationId },
          data: { status: AccountStatus.APPROVED },
        }) : prisma.$queryRaw`SELECT 1`, // dummy promise
      ]);

      await prisma.auditLog.create({
        data: {
          userId: 'admin-1', // Default system/admin executor
          action: 'APPROVE_ENTITY',
          entityType: 'USER',
          entityId: userId,
        },
      });
    } else {
      const users = await MockDatabase.read<any>('users');
      const entities = await MockDatabase.read<any>('entities');

      const uIdx = users.findIndex(u => u.id === userId);
      if (uIdx === -1) throw new AppError('User not found', 404);

      users[uIdx].status = 'approved';
      
      const eIdx = entities.findIndex((e: any) => e.id === users[uIdx].entityId);
      if (eIdx !== -1) {
        entities[eIdx].status = 'approved';
      }

      await MockDatabase.write('users', users);
      await MockDatabase.write('entities', entities);
      await MockDatabase.appendAuditLog({ type: 'APPROVE_ENTITY', userId });
    }
  }

  static async rejectEntity(userId: string): Promise<void> {
    if (env.DATABASE_MODE === 'prisma') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) throw new AppError('User not found', 404);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { status: AccountStatus.REJECTED },
        }),
        user.organizationId ? prisma.organization.update({
          where: { id: user.organizationId },
          data: { status: AccountStatus.REJECTED },
        }) : prisma.$queryRaw`SELECT 1`,
      ]);

      await prisma.auditLog.create({
        data: {
          userId: 'admin-1',
          action: 'REJECT_ENTITY',
          entityType: 'USER',
          entityId: userId,
        },
      });
    } else {
      const users = await MockDatabase.read<any>('users');
      const uIdx = users.findIndex(u => u.id === userId);
      if (uIdx === -1) throw new AppError('User not found', 404);

      users[uIdx].status = 'rejected';
      await MockDatabase.write('users', users);
      await MockDatabase.appendAuditLog({ type: 'REJECT_ENTITY', userId });
    }
  }
}
