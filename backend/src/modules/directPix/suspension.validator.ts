import { z } from 'zod';
const code=z.string().trim().regex(/^[A-Z][A-Z0-9_]{2,63}$/).max(64);
export const suspendDirectPixSchema=z.object({scope:z.enum(['KEY','FAMILY','ENTITY','DONOR_ACCOUNT','RESPONSIBLE_ACCOUNT']),targetId:z.string().uuid(),reasonCode:code,expiresAt:z.string().datetime().optional()}).strict();
export const breakGlassSchema=z.object({purposeCode:code}).strict();
export const divergentHolderSchema=z.object({reasonCode:z.enum(['BANK_HOLDER_MISMATCH','RECIPIENT_DATA_MISMATCH'])}).strict();
