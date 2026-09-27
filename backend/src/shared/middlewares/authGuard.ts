import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../errors/AppError';

/** Requires a valid, non-revoked Bearer token and checks current account state. */
export async function authGuard(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) throw new AppError('Não autenticado', 401, 'unauthenticated');

  const payload = verifyToken(header.slice('Bearer '.length).trim());
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, status: true, sessionVersion: true },
  });
  if (!user || user.status === 'blocked' || user.status === 'suspended' || user.sessionVersion !== payload.sv) {
    throw new AppError('Sessão inválida ou conta indisponível.', 401, 'invalid_session');
  }

  req.auth = { userId: user.id, role: user.role };
  next();
}
