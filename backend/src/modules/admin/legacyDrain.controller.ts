import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { correlationIdSchema, idempotencyKeySchema } from '../directPix/terms.validator';
import { legacyDrainApplySchema, legacyDrainDryRunSchema } from '../directPix/featureFlags.validator';
import {
  applyLegacyDrain as applyLegacyDrainService,
  dryRunLegacyDrain as dryRunLegacyDrainService,
} from '../directPix/legacyDrain.service';

function actorId(req: Request): string {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  return req.auth.userId;
}

function correlationId(req: Request): string {
  const value = req.header('X-Correlation-Id');
  if (!value) return randomUUID();
  const parsed = correlationIdSchema.safeParse(value);
  if (!parsed.success) throw new AppError('X-Correlation-Id inválido.', 422, 'invalid_correlation_id');
  return parsed.data;
}

function idempotencyKey(req: Request): string {
  const value = req.header('Idempotency-Key');
  if (!value) throw new AppError('Idempotency-Key é obrigatória.', 422, 'idempotency_key_required');
  const parsed = idempotencyKeySchema.safeParse(value);
  if (!parsed.success) throw new AppError('Idempotency-Key inválida.', 422, 'invalid_idempotency_key');
  return parsed.data;
}

export async function dryRunLegacyDrain(req: Request, res: Response): Promise<Response> {
  const report = await dryRunLegacyDrainService(legacyDrainDryRunSchema.parse(req.body));
  res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
  return res.json({ report });
}

export async function applyLegacyDrain(req: Request, res: Response): Promise<Response> {
  const requestCorrelationId = correlationId(req);
  const result = await applyLegacyDrainService(actorId(req), {
    ...legacyDrainApplySchema.parse(req.body),
    idempotencyKey: idempotencyKey(req),
    correlationId: requestCorrelationId,
  });
  res.set({
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
    'X-Correlation-Id': requestCorrelationId,
    ...(result.replayed ? { 'Idempotency-Replayed': 'true' } : {}),
  });
  return res.json(result);
}