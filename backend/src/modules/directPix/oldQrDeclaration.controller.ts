import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { correlationIdSchema, idempotencyKeySchema } from './terms.validator';
import { oldQrDeclarationSchema } from './oldQrDeclaration.validator';
import { reportOldQrDeclaration } from './oldQrDeclaration.service';

function actor(req: Request) { if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated'); return req.auth.userId; }
function idempotencyKey(req: Request) { const parsed = idempotencyKeySchema.safeParse(req.header('Idempotency-Key')); if (!parsed.success) throw new AppError('Idempotency-Key inválida.', 422, 'invalid_idempotency_key'); return parsed.data; }
function correlationId(req: Request) { const raw = req.header('X-Correlation-Id'); if (!raw) return randomUUID(); const parsed = correlationIdSchema.safeParse(raw); if (!parsed.success) throw new AppError('X-Correlation-Id inválido.', 422, 'invalid_correlation_id'); return parsed.data; }

export async function reportPriorCodePix(req: Request, res: Response) {
  const correlation = correlationId(req);
  const result = await reportOldQrDeclaration(actor(req), req.params.intentId, { ...oldQrDeclarationSchema.parse(req.body), idempotencyKey: idempotencyKey(req), correlationId: correlation });
  res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache', 'X-Correlation-Id': correlation });
  if (result.replayed) res.setHeader('Idempotency-Replayed', 'true');
  return res.status(result.replayed ? 200 : 201).json(result);
}
