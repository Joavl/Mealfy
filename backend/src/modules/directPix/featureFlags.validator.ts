import { z } from 'zod';
import { DIRECT_PIX_FLAG_KEYS, DIRECT_PIX_FLAG_SCOPES } from './featureFlags.service';

export const updateDirectPixFeatureFlagSchema = z.object({
  scope: z.enum(DIRECT_PIX_FLAG_SCOPES),
  entityId: z.string().uuid().optional(),
  familyId: z.string().uuid().optional(),
  enabled: z.boolean(),
  config: z.object({ pilot: z.boolean().optional() }).catchall(z.unknown()).optional(),
  expectedVersion: z.number().int().min(0),
  reason: z.object({ code: z.string().regex(/^[A-Z][A-Z0-9_]{2,63}$/), note: z.string().min(1).max(500).optional() }).strict(),
}).strict();
export const directPixFeatureFlagKeySchema = z.enum(DIRECT_PIX_FLAG_KEYS);
