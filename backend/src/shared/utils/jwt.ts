import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  sv: number;
}

function getSecret(): string {
  if (!env.JWT_SECRET) throw new AppError('JWT_SECRET não configurado no servidor', 500, 'jwt_not_configured');
  return env.JWT_SECRET;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, getSecret()) as JwtPayload;
  } catch {
    throw new AppError('Token inválido ou expirado', 401, 'invalid_token');
  }
}
