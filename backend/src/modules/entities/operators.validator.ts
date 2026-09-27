import { z } from 'zod';
import { ENTITY_OPERATOR_PERMISSIONS } from './entityAuthority.service';

const permission = z.enum(ENTITY_OPERATOR_PERMISSIONS);
export const operatorPermissionsSchema = z.array(permission).min(1).max(ENTITY_OPERATOR_PERMISSIONS.length)
  .refine((items) => new Set(items).size === items.length, 'Permissões duplicadas');

export const inviteOperatorSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  permissions: operatorPermissionsSchema,
}).strict();

export const updateOperatorSchema = z.object({
  permissions: operatorPermissionsSchema.optional(),
  status: z.enum(['active', 'suspended', 'revoked']).optional(),
}).strict().refine((input) => input.permissions !== undefined || input.status !== undefined, 'Informe uma alteração');

export const acceptOperatorInvitationSchema = z.object({ token: z.string().min(32).max(512) }).strict();
export type InviteOperatorInput = z.infer<typeof inviteOperatorSchema>;
export type UpdateOperatorInput = z.infer<typeof updateOperatorSchema>;
