import { prisma } from '../../database/prisma';
import { hashPassword, verifyPassword } from '../../shared/utils/password';
import { signToken } from '../../shared/utils/jwt';
import { AppError } from '../../shared/errors/AppError';
import type { RegisterInput, LoginInput } from './auth.validator';

export async function register(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('E-mail já cadastrado', 409, 'email_taken');

  const passwordHash = await hashPassword(input.password);
  const phone = input.phone?.trim();
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      role: input.role,
      passwordHash,
      // String vazia vira NULL — coluna opcional não deve guardar "".
      phone: phone ? phone : null,
      // entidade nasce pendente de aprovação; doador já fica ativo
      status: input.role === 'entity' ? 'pending' : 'active',
    },
  });

  const token = signToken({ sub: user.id, role: user.role });
  return { user, token };
}

export async function login(input: LoginInput) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  // Mensagem genérica (não revela se o e-mail existe)
  if (!user || !user.passwordHash) {
    throw new AppError('E-mail ou senha incorretos', 401, 'invalid_credentials');
  }
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new AppError('E-mail ou senha incorretos', 401, 'invalid_credentials');

  if (user.status === 'blocked' || user.status === 'suspended') {
    throw new AppError('Conta indisponível. Contate o suporte.', 403, 'account_unavailable');
  }

  const token = signToken({ sub: user.id, role: user.role });
  return { user, token };
}
