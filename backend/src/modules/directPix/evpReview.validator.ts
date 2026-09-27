import { z } from 'zod';

export const evpReviewReasonSchema = z.enum([
  'EXACT_NAME_MATCH', 'ABBREVIATED_NAME', 'SOCIAL_NAME', 'CIVIL_NAME_UPDATE',
  'HOLDER_NAME_MISMATCH', 'EVP_MISMATCH', 'OTHER_MISMATCH',
]);

export const reviewEvpKeySchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: evpReviewReasonSchema,
  // The precise civil name is minimum evidence, encrypted immediately, and is never accepted as free-form notes.
  expectedCivilName: z.string().trim().min(2).max(180),
}).strict().superRefine((value, context) => {
  const justifiedNameDifference = ['ABBREVIATED_NAME', 'SOCIAL_NAME', 'CIVIL_NAME_UPDATE'].includes(value.reason);
  if (value.decision === 'APPROVE' && ['HOLDER_NAME_MISMATCH', 'EVP_MISMATCH', 'OTHER_MISMATCH'].includes(value.reason)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Motivo incompatível com aprovação.' });
  }
  if (value.decision === 'APPROVE' && !justifiedNameDifference && value.reason !== 'EXACT_NAME_MATCH') {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Motivo de aprovação inválido.' });
  }
});

export const secondApproveEvpKeySchema = z.object({
  reason: z.enum(['EXACT_NAME_MATCH', 'ABBREVIATED_NAME', 'SOCIAL_NAME', 'CIVIL_NAME_UPDATE']),
  expectedCivilName: z.string().trim().min(2).max(180),
}).strict();

export type ReviewEvpKeyInput = z.infer<typeof reviewEvpKeySchema>;
export type SecondApproveEvpKeyInput = z.infer<typeof secondApproveEvpKeySchema>;
