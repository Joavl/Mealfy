import { z } from 'zod';

export const stepUpPurposeSchema = z.enum(['view_pix_key', 'change_pix_key', 'revoke_pix_key', 'confirm_direct_pix_receipt', 'break_glass_evp']);
const resourceId = z.string().trim().min(1).max(128).optional();

export const createStepUpChallengeSchema = z.object({
  password: z.string().min(1).max(256),
  purpose: stepUpPurposeSchema,
  resourceId,
}).strict();

export const confirmStepUpChallengeSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, 'Informe o código de 6 dígitos'),
  purpose: stepUpPurposeSchema,
  resourceId,
}).strict();

export const validateStepUpAuthorizationSchema = z.object({
  authorizationToken: z.string().min(32).max(256),
  purpose: stepUpPurposeSchema,
  resourceId,
}).strict();

export type CreateStepUpChallengeInput = z.infer<typeof createStepUpChallengeSchema>;
export type ConfirmStepUpChallengeInput = z.infer<typeof confirmStepUpChallengeSchema>;
