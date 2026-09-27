import { z } from 'zod';

export const cancelDeclarationSchema = z.object({
  reason: z.enum(['TRANSFER_NOT_SENT', 'DONOR_CHANGED_MIND', 'OTHER']),
}).strict();

const exactResponse = z.object({ outcome: z.literal('RECEIVED_EXACT') }).strict();
const differentResponse = z.object({ outcome: z.literal('RECEIVED_DIFFERENT'), receivedAmountCents: z.number().int().min(1).max(100000) }).strict();
const notLocatedResponse = z.object({ outcome: z.literal('NOT_LOCATED') }).strict();

export const responsibleReceiptResponseSchema = z.union([exactResponse, differentResponse, notLocatedResponse]);
export const assistedReceiptResponseSchema = z.union([
  z.object({ outcome: z.literal('RECEIVED_EXACT'), assistedChannel: z.enum(['IN_PERSON', 'PHONE']) }).strict(),
  z.object({ outcome: z.literal('RECEIVED_DIFFERENT'), receivedAmountCents: z.number().int().min(1).max(100000), assistedChannel: z.enum(['IN_PERSON', 'PHONE']) }).strict(),
  z.object({ outcome: z.literal('NOT_LOCATED'), assistedChannel: z.enum(['IN_PERSON', 'PHONE']) }).strict(),
]);

export type CancelDeclarationInput = z.infer<typeof cancelDeclarationSchema>;
export type ResponsibleReceiptResponseInput = z.infer<typeof responsibleReceiptResponseSchema>;
export type AssistedReceiptResponseInput = z.infer<typeof assistedReceiptResponseSchema>;
