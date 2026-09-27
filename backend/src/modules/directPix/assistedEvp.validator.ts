import { z } from 'zod';

export const submitAssistedEvpKeySchema = z.object({
  keyType: z.literal('EVP'),
  evp: z.string().trim().min(1).max(128),
}).strict();

export const confirmAssistedEvpKeySchema = z.object({}).strict();
