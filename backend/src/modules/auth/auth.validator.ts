import { z } from 'zod';

/**
 * Registro público: apenas `donor` e `entity` podem se auto-cadastrar.
 * - `beneficiary` é criado pela ENTIDADE (não se auto-cadastra).
 * - `admin` é provisionado internamente (seed/outro admin), nunca via /register.
 * Enviar role 'admin'/'beneficiary' resulta em 422 (role inválido).
 */
export const registerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['donor', 'entity']),
  /**
   * O formulário de cadastro já coleta telefone. Sem estar declarado aqui o zod
   * o REMOVIA silenciosamente (comportamento padrão de strip), e o usuário era
   * criado com phone NULL sem nenhum erro aparente.
   */
  phone: z.string().max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
