import { z } from 'zod';

export const acceptDirectPixTermsSchema = z.object({
  version: z.string().trim().min(1).max(64),
}).strict();

export const idempotencyKeySchema = z.string().trim().min(8).max(128)
  .regex(/^[A-Za-z0-9._:-]+$/, 'Idempotency-Key inválida');

export const correlationIdSchema = z.string().uuid();

export type AcceptDirectPixTermsInput = z.infer<typeof acceptDirectPixTermsSchema>;
