import { z } from 'zod';
export const createIntentSchema = z.object({ familyId: z.string().uuid(), amountCents: z.number().int().min(500).max(100000) }).strict();
export const declarationSchema = z.object({}).strict();
