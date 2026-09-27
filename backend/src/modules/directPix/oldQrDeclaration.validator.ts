import { z } from 'zod';

export const oldQrDeclarationSchema = z.object({
  amountCents: z.number().int().min(500).max(100000),
  approximatePaidAt: z.coerce.date().refine((value) => value <= new Date(), 'A data aproximada não pode estar no futuro.'),
  reasonCode: z.enum(['SAVED_QR_CODE', 'LATE_DECLARATION', 'OTHER']),
}).strict();

export type OldQrDeclarationInput = z.infer<typeof oldQrDeclarationSchema>;
