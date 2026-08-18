import { z } from 'zod';

export const providerEnum = z.enum(['ifood', 'ninetynine', 'carrefour']);
export const giftCardStatusEnum = z.enum(['available', 'reserved', 'used', 'expired', 'invalid']);

export const importGiftCardsSchema = z.object({
  provider: providerEnum,
  batchName: z.string().min(1),
  amount: z.number().int().positive(), // centavos
  expiresAt: z.string().datetime().optional(),
  codes: z.array(z.string()).min(1, 'Informe ao menos um código'),
});

export const listGiftCardsQuerySchema = z.object({
  provider: providerEnum.optional(),
  status: giftCardStatusEnum.optional(),
  batchId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const invalidateGiftCardSchema = z.object({ reason: z.string().max(300).optional() });

export const giftCardOrderStatusEnum = z.enum([
  'pending',
  'processing',
  'issued',
  'failed',
  'manual_review',
  'canceled',
]);

export const listGiftCardOrdersQuerySchema = z.object({
  status: giftCardOrderStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

/** Parâmetros opcionais da reconciliação; sem eles vale o default do env. */
export const reconcileOrdersSchema = z.object({
  staleMinutes: z.coerce.number().int().positive().max(1440).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export type ImportGiftCardsInput = z.infer<typeof importGiftCardsSchema>;
export type ListGiftCardsQuery = z.infer<typeof listGiftCardsQuerySchema>;
export type ListGiftCardOrdersQuery = z.infer<typeof listGiftCardOrdersQuerySchema>;
