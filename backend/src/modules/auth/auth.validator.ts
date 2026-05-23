import { z } from 'zod';

const digitsOnly = (value: string) => value.replace(/\D/g, '');

export const registerDonorSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6).optional(),
  documentType: z.enum(['cpf', 'cnpj']),
  documentNumber: z
    .string()
    .min(1, 'Informe o documento')
    .transform(digitsOnly)
    .refine((v) => v.length >= 11, 'CPF/CNPJ deve ter pelo menos 11 dígitos'),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  privacySettings: z
    .object({
      showInstagram: z.boolean().optional(),
      showOnRanking: z.boolean().optional(),
      anonymousMode: z.boolean().optional(),
    })
    .optional(),
});

export const registerEntitySchema = z.object({
  name: z.string().min(3, 'Nome da entidade deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6).optional(),
  cnpj: z
    .string()
    .min(1, 'Informe o CNPJ')
    .transform(digitsOnly)
    .refine((v) => v.length >= 14, 'CNPJ deve ter 14 dígitos'),
  region: z.string().min(3, 'Informe a região'),
  type: z.enum(['ONG', 'igreja', 'escola', 'instituto']),
  responsibleName: z.string().min(3, 'Nome do responsável obrigatório'),
  phone: z.string().min(8, 'Telefone inválido'),
  addressOrDistrict: z.string().optional(),
  websiteOrInstagram: z.string().optional(),
  shortDescription: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const registerBeneficiarySchema = z.object({
  familyName: z.string().min(2),
  responsibleName: z.string().min(3),
  responsibleCpf: z
    .string()
    .min(1)
    .transform(digitsOnly)
    .refine((v) => v.length >= 11, 'CPF inválido'),
  childrenCount: z.number().int().min(1).max(12),
  childrenNames: z.array(z.string().min(1)).min(1),
  photoUrl: z.string().min(10),
  region: z.string().min(2),
  neighborhood: z.string().optional(),
  shortAddress: z.string().optional(),
  city: z.string().default('São Paulo'),
  state: z.string().length(2).default('SP'),
});
