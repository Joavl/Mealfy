import { z } from 'zod';

export const createFamilySchema = z.object({
  representativeName: z.string().min(3),
  communityId: z.string().optional(),
  neighborhood: z.string().min(2),
  city: z.string().default('São Paulo'),
  state: z.string().length(2).default('SP'),
  shortAddress: z.string().min(3),
  description: z.string().default(''),
  childrenCount: z.number().int().min(1),
  mainNeed: z.string().default('Alimentação Básica'),
  latitude: z.number(),
  longitude: z.number(),
  authorizingEntityId: z.string().optional(),
  createdByEntityId: z.string().optional(),
  sourceType: z.enum(['entity', 'donor_indication']).optional(),
  sourceLabel: z.string().optional(),
  sourceEntityName: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
  supportStatus: z.string().optional(),
});

export const updateFamilyStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
  supportStatus: z.enum(['needs_help', 'fed', 'rejected', 'suspended']).optional(),
});
