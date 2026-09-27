import type { Prisma } from '@prisma/client';
import { AppError } from '../../shared/errors/AppError';
import { resolveEntityAuthority, type EntityOperatorPermission } from './entityAuthority.service';

/**
 * Records who acted under which entity authority. When a review is recorded,
 * the submitter membership is compared inside the same transaction so maker
 * and checker can never be the same operator.
 */
export async function recordDirectPixOperatorAction(
  tx: Prisma.TransactionClient,
  input: {
    actorUserId: string;
    requiredPermission: Extract<EntityOperatorPermission, 'pix.submit' | 'pix.review' | 'pix.follow_up'>;
    resourceType: string;
    resourceId: string;
    action: 'submit' | 'review' | 'follow_up';
  },
) {
  const authority = await resolveEntityAuthority(input.actorUserId, input.requiredPermission, tx);
  if (input.action === 'review') {
    const submission = await tx.directPixOperatorAction.findFirst({
      where: { entityId: authority.entityId, resourceType: input.resourceType, resourceId: input.resourceId, action: 'submit' },
      select: { membershipId: true, entityId: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!submission || submission.entityId !== authority.entityId) {
      throw new AppError('Recurso não encontrado.', 404, 'direct_pix_resource_not_found');
    }
    if (submission.membershipId === authority.membershipId) {
      throw new AppError('Quem submeteu não pode revisar a mesma versão.', 409, 'maker_checker_conflict');
    }
  }
  return tx.directPixOperatorAction.create({ data: {
    entityId: authority.entityId,
    membershipId: authority.membershipId,
    actorUserId: input.actorUserId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    action: input.action,
  } });
}
