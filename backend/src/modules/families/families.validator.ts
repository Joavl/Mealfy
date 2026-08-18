import { z } from 'zod';
import { validateNis } from '../../shared/utils/nisValidator';

export const providerEnum = z.enum(['ifood', 'ninetynine', 'carrefour']);

const dependentSchema = z.object({
  name: z.string().min(1, 'Nome do dependente obrigatório'),
  age: z.number().int().min(0).max(120),
  relationship: z.string().max(40).optional(),
});

export const createFamilySchema = z.object({
  responsibleName: z.string().min(2),
  displayName: z.string().min(2),
  city: z.string().min(1),
  state: z.string().length(2),
  neighborhood: z.string().optional(),
  community: z.string().optional(),
  approximateAddress: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  cpf: z.string().optional(), // mascarado antes de salvar; completo NÃO é armazenado
  nis: z
    .string()
    .refine((v) => validateNis(v), { message: 'NIS inválido — verifique o dígito verificador' })
    .optional(),
  preferredGiftCardProvider: providerEnum.optional(),
  socialDescription: z.string().max(500).optional(),
  entityId: z.string().uuid().optional(), // apenas admin pode definir
  dependents: z.array(dependentSchema).min(1, 'Informe ao menos um dependente'),
});

export const updateFamilySchema = z.object({
  responsibleName: z.string().min(2).optional(),
  displayName: z.string().min(2).optional(),
  city: z.string().min(1).optional(),
  state: z.string().length(2).optional(),
  neighborhood: z.string().nullable().optional(),
  community: z.string().nullable().optional(),
  approximateAddress: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  preferredGiftCardProvider: providerEnum.optional(),
  socialDescription: z.string().max(500).nullable().optional(),
  needToday: z.boolean().optional(),
});

export const requestDailySupportSchema = z.object({ provider: providerEnum });
export const rejectSchema = z.object({ reason: z.string().max(300).optional() });

export const listFamiliesQuerySchema = z.object({
  approvalStatus: z.enum(['pending', 'approved', 'rejected', 'blocked']).optional(),
  state: z.string().length(2).optional(),
});

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type UpdateFamilyInput = z.infer<typeof updateFamilySchema>;
export type ListFamiliesQuery = z.infer<typeof listFamiliesQuerySchema>;
