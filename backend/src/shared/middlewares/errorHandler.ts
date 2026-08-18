import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

/**
 * Handler global de erros. Mantém respostas previsíveis e nunca vaza stack/PII.
 * Códigos de gift card e segredos NUNCA devem chegar aqui — não logar req.body cru.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message, code: err.code });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      message: 'Erro de validação',
      issues: err.flatten(),
    });
  }

  console.error('[errorHandler] Erro não tratado:', err instanceof Error ? err.message : err);
  return res.status(500).json({ message: 'Erro interno do servidor' });
}
