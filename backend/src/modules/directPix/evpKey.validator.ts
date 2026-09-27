import { z } from 'zod';

export const submitEvpKeySchema = z.object({
  keyType: z.literal('EVP'),
  evp: z.string().trim().min(1).max(128),
}).strict();

// Codes are stable, non-sensitive reason identifiers rather than free-text notes.
export const revokeEvpKeySchema = z.object({
  reason: z.string().trim().regex(/^[A-Z][A-Z0-9_]{2,63}$/, 'Motivo de revogação inválido'),
}).strict();
