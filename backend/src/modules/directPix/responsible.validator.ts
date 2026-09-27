import { z } from 'zod';

export const inviteFamilyResponsibleSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
}).strict();
export const acceptFamilyResponsibleInvitationSchema = z.object({
  token: z.string().min(32).max(512),
}).strict();
export const endFamilyResponsibleAssignmentSchema = z.object({
  endReason: z.enum(['reassigned', 'relationship_ended', 'account_inactive', 'data_correction']),
}).strict();

export const idempotencyKeySchema = z.string().trim().min(8).max(255).regex(/^[A-Za-z0-9._:-]+$/, 'Idempotency-Key inválida');
