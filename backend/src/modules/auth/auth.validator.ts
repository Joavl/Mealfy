import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  role: z.enum(['donor', 'entity']),
  phone: z.string().max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

export const emailVerificationRequestSchema = z.object({ email: z.string().trim().toLowerCase().email('E-mail inválido') });
export const emailVerificationConfirmSchema = z.object({ token: z.string().min(43).max(256) });
export const passwordResetRequestSchema = z.object({ email: z.string().email('E-mail inválido') });
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(43).max(256),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EmailVerificationRequestInput = z.infer<typeof emailVerificationRequestSchema>;
export type EmailVerificationConfirmInput = z.infer<typeof emailVerificationConfirmSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
