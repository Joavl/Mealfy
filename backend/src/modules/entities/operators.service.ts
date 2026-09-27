import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { sendEntityOperatorInvitationEmail } from '../../shared/services/mailer';
import { ENTITY_OPERATOR_PERMISSIONS, resolveEntityAuthority } from './entityAuthority.service';
import { toOperatorSummary } from './operators.dto';
import type { InviteOperatorInput, UpdateOperatorInput } from './operators.validator';

const OPERATOR_SELECT = {
  id: true,
  status: true,
  permissions: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true, emailVerifiedAt: true } },
} as const;
const INVITATION_TTL_MS = 48 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function listOperators(actorUserId: string) {
  const authority = await resolveEntityAuthority(actorUserId, 'operators.manage');
  const operators = await prisma.entityOperatorMembership.findMany({
    where: { entityId: authority.entityId },
    select: OPERATOR_SELECT,
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
  });
  return {
    operators: operators.map(toOperatorSummary),
    availablePermissions: [...ENTITY_OPERATOR_PERMISSIONS],
    currentMembershipId: authority.membershipId,
    canManage: authority.permissions.includes('operators.manage'),
  };
}

export async function listOperatorsForAdmin(entityId: string) {
  const entity = await prisma.entity.findUnique({ where: { id: entityId }, select: { id: true } });
  if (!entity) throw new AppError('Entidade não encontrada', 404, 'entity_not_found');
  const operators = await prisma.entityOperatorMembership.findMany({
    where: { entityId }, select: OPERATOR_SELECT, orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
  });
  return operators.map(toOperatorSummary);
}

export async function inviteOperator(actorUserId: string, input: InviteOperatorInput) {
  const authority = await resolveEntityAuthority(actorUserId, 'operators.manage');
  const account = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, role: true, status: true, emailVerifiedAt: true },
  });
  const rawToken = randomBytes(32).toString('base64url');
  const invitation = await prisma.$transaction(async (tx) => {
    await resolveEntityAuthority(actorUserId, 'operators.manage', tx);
    if (account) {
      const existing = await tx.entityOperatorMembership.findFirst({ where: { userId: account.id } });
      if (existing && existing.entityId !== authority.entityId) {
        throw new AppError('O operador já possui vínculo com outra entidade.', 409, 'operator_already_linked');
      }
      if (existing?.status === 'active') throw new AppError('O operador já está ativo.', 409, 'operator_already_active');
    }
    await tx.entityOperatorInvitation.updateMany({
      where: { entityId: authority.entityId, email: input.email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const created = await tx.entityOperatorInvitation.create({
      data: {
        entityId: authority.entityId,
        email: input.email,
        tokenHash: hashToken(rawToken),
        permissions: input.permissions,
        invitedByUserId: actorUserId,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
      select: { id: true, email: true, permissions: true, expiresAt: true, createdAt: true },
    });
    await tx.auditLog.create({ data: {
      actorUserId, actorRole: 'entity', action: 'entity.operator.invited', entityType: 'entity_operator_invitation',
      entityId: created.id, channel: 'web_pwa', result: 'invited',
      metadata: { authorityEntityId: authority.entityId, authorityMembershipId: authority.membershipId, permissions: input.permissions },
    } });
    await tx.outboxEvent.create({ data: {
      eventType: 'entity.operator.invited', aggregateType: 'entity_operator_invitation', aggregateId: created.id,
      dedupeKey: `entity-operator-invited:${created.id}`,
    } });
    return created;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  try {
    await sendEntityOperatorInvitationEmail(input.email, rawToken);
  } catch (error) {
    // A bearer invitation without delivery must never remain usable.
    await prisma.entityOperatorInvitation.updateMany({
      where: { id: invitation.id, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw error;
  }

  // The bearer token is delivered only through the restricted mail channel and
  // is deliberately absent from browser/API DTOs.
  return { invitation };
}

export async function acceptInvitation(actorUserId: string, rawToken: string) {
  const digest = hashToken(rawToken);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: actorUserId }, select: { id: true, email: true, emailVerifiedAt: true, status: true } });
    if (!user || !user.emailVerifiedAt || user.status !== 'active') throw new AppError('Conta verificada ativa obrigatória.', 403, 'verified_account_required');
    const invitation = await tx.entityOperatorInvitation.findUnique({ where: { tokenHash: digest } });
    if (!invitation || invitation.email !== user.email.toLowerCase() || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) {
      throw new AppError('Convite inválido ou expirado.', 400, 'invalid_operator_invitation');
    }
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`entity-operator:${actorUserId}`}))`;
    const other = await tx.entityOperatorMembership.findFirst({ where: { userId: actorUserId, entityId: { not: invitation.entityId }, status: 'active' } });
    if (other) throw new AppError('A conta já possui vínculo ativo com outra entidade.', 409, 'operator_already_linked');
    const acceptedAt = new Date();
    const consumed = await tx.entityOperatorInvitation.updateMany({
      where: { id: invitation.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: acceptedAt } },
      data: { acceptedAt, acceptedByUserId: actorUserId },
    });
    if (consumed.count !== 1) throw new AppError('Convite inválido ou expirado.', 400, 'invalid_operator_invitation');
    const membership = await tx.entityOperatorMembership.upsert({
      where: { entityId_userId: { entityId: invitation.entityId, userId: actorUserId } },
      create: { entityId: invitation.entityId, userId: actorUserId, status: 'active', permissions: invitation.permissions, invitedByUserId: invitation.invitedByUserId, activatedAt: acceptedAt },
      update: { status: 'active', permissions: invitation.permissions, activatedAt: acceptedAt, suspendedAt: null, revokedAt: null },
      select: OPERATOR_SELECT,
    });
    await tx.user.update({ where: { id: actorUserId }, data: { role: 'entity', sessionVersion: { increment: 1 } } });
    await tx.auditLog.create({ data: {
      actorUserId, actorRole: 'entity', action: 'entity.operator.invitation_accepted', entityType: 'entity_operator_membership', entityId: membership.id,
      channel: 'web_pwa', result: 'active', metadata: { authorityEntityId: invitation.entityId, invitationId: invitation.id },
    } });
    return toOperatorSummary(membership);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateOperator(actorUserId: string, membershipId: string, input: UpdateOperatorInput) {
  return prisma.$transaction(async (tx) => {
    const authority = await resolveEntityAuthority(actorUserId, 'operators.manage', tx);
    const current = await tx.entityOperatorMembership.findFirst({ where: { id: membershipId, entityId: authority.entityId } });
    if (!current) throw new AppError('Operador não encontrado.', 404, 'operator_not_found');
    const nextStatus = input.status ?? current.status;
    const nextPermissions = input.permissions ?? current.permissions;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`entity-operator:${current.userId}`}))`;
    if (nextStatus === 'active' && current.status !== 'active') {
      const activeElsewhere = await tx.entityOperatorMembership.findFirst({
        where: { userId: current.userId, entityId: { not: authority.entityId }, status: 'active' },
        select: { id: true },
      });
      if (activeElsewhere) throw new AppError('O operador já possui vínculo ativo com outra entidade.', 409, 'operator_already_linked');
    }
    if (current.id === authority.membershipId && nextStatus !== 'active') {
      throw new AppError('Você não pode suspender ou remover o próprio vínculo.', 409, 'cannot_remove_self');
    }
    const losesManager = current.status === 'active' && current.permissions.includes('operators.manage')
      && (nextStatus !== 'active' || !nextPermissions.includes('operators.manage'));
    if (losesManager) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`entity-managers:${authority.entityId}`}))`;
      const managers = await tx.entityOperatorMembership.count({ where: { entityId: authority.entityId, status: 'active', permissions: { has: 'operators.manage' } } });
      if (managers <= 1) throw new AppError('A entidade precisa manter um gestor ativo.', 409, 'last_entity_manager');
    }
    const updated = await tx.entityOperatorMembership.update({
      where: { id: current.id },
      data: {
        permissions: nextPermissions,
        status: nextStatus,
        suspendedAt: nextStatus === 'suspended' ? new Date() : null,
        revokedAt: nextStatus === 'revoked' ? new Date() : null,
        activatedAt: nextStatus === 'active' ? new Date() : current.activatedAt,
      },
      select: OPERATOR_SELECT,
    });
    if (nextStatus !== current.status || input.permissions) {
      await tx.user.update({ where: { id: current.userId }, data: { sessionVersion: { increment: 1 } } });
    }
    if (nextStatus === 'suspended' || nextStatus === 'revoked') {
      const target = await tx.user.findUnique({ where: { id: current.userId }, select: { email: true } });
      if (target) await tx.entityOperatorInvitation.updateMany({
        where: { entityId: authority.entityId, email: target.email.toLowerCase(), acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await tx.auditLog.create({ data: {
      actorUserId, actorRole: 'entity', action: nextStatus === 'revoked' ? 'entity.operator.revoked' : 'entity.operator.changed',
      entityType: 'entity_operator_membership', entityId: current.id, channel: 'web_pwa', result: nextStatus,
      metadata: {
        authorityEntityId: authority.entityId, authorityMembershipId: authority.membershipId,
        previousStatus: current.status, nextStatus, previousPermissions: current.permissions, nextPermissions,
      },
    } });
    await tx.outboxEvent.create({ data: {
      eventType: nextStatus === 'revoked' ? 'entity.operator.revoked' : 'entity.operator.changed',
      aggregateType: 'entity_operator_membership', aggregateId: current.id,
      dedupeKey: `entity-operator-changed:${current.id}:${randomUUID()}`,
    } });
    return toOperatorSummary(updated);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
