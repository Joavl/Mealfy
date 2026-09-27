import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError';
import { correlationIdSchema, idempotencyKeySchema } from './terms.validator';
import { revokeEvpKeySchema, submitEvpKeySchema } from './evpKey.validator';
import * as evpKeyService from './evpKey.service';

const CANONICAL_EVP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const stepUpTokenSchema = z.string().min(32).max(256);
function actorId(req: Request): string { if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated'); return req.auth.userId; }
function requiredHeader(req: Request, name: string, schema: z.ZodType<string>, missingCode: string, invalidCode: string): string {
  const value = req.header(name);
  if (!value) throw new AppError(name + ' é obrigatório.', 422, missingCode);
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AppError(name + ' inválido.', 422, invalidCode);
  return parsed.data;
}
function canonicalEvp(value: string): string {
  const normalized = value.toLowerCase();
  if (!CANONICAL_EVP.test(normalized)) throw new AppError('Informe somente uma chave aleatória Pix (EVP) no formato UUID canônico.', 422, 'invalid_evp');
  return normalized;
}
export async function getCurrentOwnEvpKey(req: Request, res: Response): Promise<Response> {
  const authorization = requiredHeader(req, 'X-Step-Up-Authorization', stepUpTokenSchema, 'step_up_authorization_required', 'invalid_step_up_authorization');
  const keyVersion = await evpKeyService.readCurrentEvpKey(actorId(req), authorization);
  return res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' }).json({ keyVersion });
}

export async function revokeOwnEvpKey(req: Request, res: Response): Promise<Response> {
  const body = revokeEvpKeySchema.parse(req.body);
  const suppliedCorrelation = req.header('X-Correlation-Id');
  const correlationId = suppliedCorrelation ? requiredHeader(req, 'X-Correlation-Id', correlationIdSchema, 'invalid_correlation_id', 'invalid_correlation_id') : randomUUID();
  const result = await evpKeyService.revokeOwnEvpKey(actorId(req), req.params.versionId, {
    reason: body.reason,
    idempotencyKey: requiredHeader(req, 'Idempotency-Key', idempotencyKeySchema, 'idempotency_key_required', 'invalid_idempotency_key'),
    correlationId,
    stepUpAuthorization: requiredHeader(req, 'X-Step-Up-Authorization', stepUpTokenSchema, 'step_up_authorization_required', 'invalid_step_up_authorization'),
  });
  const response = res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache', 'X-Correlation-Id': correlationId });
  if (result.replayed) response.setHeader('Idempotency-Replayed', 'true');
  return response.json({ keyVersion: result.version });
}

export async function submitOwnEvpKey(req: Request, res: Response): Promise<Response> {
  const body = submitEvpKeySchema.parse(req.body);
  const suppliedCorrelation = req.header('X-Correlation-Id');
  const correlationId = suppliedCorrelation ? requiredHeader(req, 'X-Correlation-Id', correlationIdSchema, 'invalid_correlation_id', 'invalid_correlation_id') : randomUUID();
  const result = await evpKeyService.submitEvpKey(actorId(req), {
    evp: canonicalEvp(body.evp),
    idempotencyKey: requiredHeader(req, 'Idempotency-Key', idempotencyKeySchema, 'idempotency_key_required', 'invalid_idempotency_key'),
    correlationId,
    stepUpAuthorization: requiredHeader(req, 'X-Step-Up-Authorization', stepUpTokenSchema, 'step_up_authorization_required', 'invalid_step_up_authorization'),
  });
  res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache', 'X-Correlation-Id': correlationId });
  if (result.replayed) res.setHeader('Idempotency-Replayed', 'true');
  return res.status(201).json({ keyVersion: result.version });
}
