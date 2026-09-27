import { prisma } from '../../database/prisma';
import { getCurrentCycleStart, wasFedThisCycle } from '../../shared/utils/feedCycle';
import { evaluateDirectPixFeature } from './featureFlags.service';
import type { DirectPixPublicFamilyProjection } from './publicFamilyProjection.dto';

/**
 * Read-only donor-facing Direct Pix projection. It intentionally does not use
 * `beneficiaryUserId` or a legacy beneficiary endpoint: responsibility is proven
 * only by a current assignment and an ACTIVE EVP version bound to it.
 *
 * Every failed/missing control collapses into UNAVAILABLE. This prevents both
 * operational-reason disclosure and accidental fail-open behavior.
 */
export async function getDirectPixPublicFamilyProjection(
  familyId: string,
  now: Date = new Date(),
): Promise<DirectPixPublicFamilyProjection> {
  try {
    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: {
        id: true,
        entityId: true,
        approvalStatus: true,
        lastFedAt: true,
        responsibleAssignments: {
          where: { endedAt: null, responsibleUser: { status: 'active' } },
          select: { id: true },
        },
        directPixEvpKeyVersions: {
          where: { status: 'ACTIVE' },
          select: { assignmentId: true },
        },
      },
    });

    if (!family || family.approvalStatus !== 'approved') {
      return { id: familyId, availability: 'UNAVAILABLE' };
    }

    const activeAssignmentIds = new Set(family.responsibleAssignments.map((assignment) => assignment.id));
    const hasCurrentResponsibleWithActiveKey = family.directPixEvpKeyVersions.some((keyVersion) =>
      activeAssignmentIds.has(keyVersion.assignmentId),
    );
    if (!hasCurrentResponsibleWithActiveKey) {
      return { id: family.id, availability: 'UNAVAILABLE' };
    }

    const [creation, disclosure] = await Promise.all([
      evaluateDirectPixFeature('CREATION', family.id, family.entityId),
      evaluateDirectPixFeature('DISCLOSURE', family.id, family.entityId),
    ]);
    if (!creation.enabled || !disclosure.enabled) {
      return { id: family.id, availability: 'UNAVAILABLE' };
    }

    if (wasFedThisCycle(family.lastFedAt, now)) {
      return { id: family.id, availability: 'SERVED_THIS_CYCLE' };
    }

    // Direct Pix lifecycle is separate from legacy donations/payments. Only the
    // current-cycle lock may advertise IN_PROGRESS to donor-facing endpoints.
    const cycleStart = getCurrentCycleStart(now);
    const inProgress = await prisma.familySupportCycle.findUnique({
      where: { familyId_cycleStartAt: { familyId: family.id, cycleStartAt: cycleStart } },
      select: { id: true },
    });
    return { id: family.id, availability: inProgress ? 'IN_PROGRESS' : 'AVAILABLE' };
  } catch {
    // The public boundary never leaks a missing relation, flag failure, or DB reason.
    return { id: familyId, availability: 'UNAVAILABLE' };
  }
}

/**
 * Batch shape for donor directory/map projections. Preserve caller ordering while
 * keeping unknown IDs generic-unavailable instead of exposing lookup reasons.
 */
export async function getDirectPixPublicFamilyProjections(
  familyIds: readonly string[],
  now: Date = new Date(),
): Promise<DirectPixPublicFamilyProjection[]> {
  return Promise.all(familyIds.map((familyId) => getDirectPixPublicFamilyProjection(familyId, now)));
}
