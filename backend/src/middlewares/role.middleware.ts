import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError';

export const roleGuard = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return next(new AppError('Unauthorized', 401));
    }

    const userRole = (user.role || '').toUpperCase();
    const isAllowed = allowedRoles.some(role => role.toUpperCase() === userRole);

    if (!isAllowed) {
      return next(new AppError('Forbidden: Insufficient permissions', 403));
    }

    next();
  };
};

export const approvedEntityGuard = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return next(new AppError('Unauthorized', 401));
  }

  const userRole = (user.role || '').toUpperCase();
  if (userRole === 'ADMIN') {
    return next();
  }

  if (userRole !== 'ENTITY') {
    return next(new AppError('Forbidden: Only organization entity users are allowed', 403));
  }

  const orgStatus = (user.organization?.status || user.status || '').toUpperCase();
  if (orgStatus !== 'APPROVED') {
    return next(new AppError('Forbidden: Your organization is pending approval', 403));
  }

  next();
};

export const adminGuard = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user || (user.role || '').toUpperCase() !== 'ADMIN') {
    return next(new AppError('Forbidden: Admin access required', 403));
  }
  next();
};
