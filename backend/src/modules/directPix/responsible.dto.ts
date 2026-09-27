import type { FamilyApprovalStatus, FamilyResponsibleAssignmentEndReason } from '@prisma/client';

type AssignmentWithFamily = {
  id: string; familyId: string; responsibleUserId: string; assignedAt: Date; endedAt: Date | null; endReason: FamilyResponsibleAssignmentEndReason | null;
  family: { id: string; displayName: string; entityId: string | null; approvalStatus: FamilyApprovalStatus };
};
export function toFamilyResponsibleAssignmentDto(assignment: AssignmentWithFamily) {
  return {
    id: assignment.id,
    familyId: assignment.familyId,
    responsibleUserId: assignment.responsibleUserId,
    assignedAt: assignment.assignedAt,
    endedAt: assignment.endedAt,
    endReason: assignment.endReason,
    family: { id: assignment.family.id, displayName: assignment.family.displayName },
  };
}
