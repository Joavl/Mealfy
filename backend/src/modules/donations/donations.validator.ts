import { z } from 'zod';

export const createDonationSchema = z.object({
  familyId: z.string(),
  amount: z.number().positive(),
  message: z.string().optional(),
  communityId: z.string().optional(),
});

export const batchDonationSchema = z.object({
  familyIds: z.array(z.string()),
  amountPerFamily: z.number().positive().optional(),
});

export const regionalDonationSchema = z.object({
  communityId: z.string(),
  totalAmount: z.number().positive(),
});
