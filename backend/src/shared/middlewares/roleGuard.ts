import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';
import { AppError } from '../errors/AppError';

/** Restringe a rota aos papéis informados. Deve vir depois do authGuard. */
export function roleGuard(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw new AppError('Não autenticado', 401, 'unauthenticated');
    }
    if (!roles.includes(req.auth.role)) {
      throw new AppError('Acesso negado', 403, 'forbidden');
    }
    next();
  };
}
