import { prisma } from '../../database/prisma';
import type { Prisma } from '@prisma/client';

export interface AuditInput {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/** Registra uma ação crítica. Nunca deve conter PII sensível nem código de gift card. */
export async function createAuditLog(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
    },
  });
}

export async function listAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
}
