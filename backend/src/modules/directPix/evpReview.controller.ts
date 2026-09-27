import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError';
import { correlationIdSchema, idempotencyKeySchema } from './terms.validator';
import { reviewEvpKeySchema, secondApproveEvpKeySchema } from './evpReview.validator';
import * as reviewService from './evpReview.service';

function actorId(req: Request) { if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated'); return req.auth.userId; }
function requiredHeader(req: Request, name: string, schema: z.ZodType<string>, missingCode: string, invalidCode: string) {
  const value = req.header(name);
  if (!value) throw new AppError(name + ' é obrigatório.', 422, missingCode);
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AppError(name + ' inválido.', 422, invalidCode);
  return parsed.data;
}
function correlationId(req: Request) {
  const provided = req.header('X-Correlation-Id');
  return provided ? requiredHeader(req, 'X-Correlation-Id', correlationIdSchema, 'invalid_correlation_id', 'invalid_correlation_id') : randomUUID();
}
function idempotencyKey(req: Request) { return requiredHeader(req, 'Idempotency-Key', idempotencyKeySchema, 'idempotency_key_required', 'invalid_idempotency_key'); }
function response(res: Response, correlation: string, body: Awaited<ReturnType<typeof reviewService.reviewEvpKey>>, status: number) {
  res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache', 'X-Correlation-Id': correlation });
  if (body.replayed) res.setHeader('Idempotency-Replayed', 'true');
  return res.status(status).json(body);
}

export async function getEvpReviewQueue(req: Request, res: Response) {
  const queue = await reviewService.listEvpReviewQueue(actorId(req));
  res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
  return res.status(200).json({ queue });
}
export async function reviewEvpKey(req: Request, res: Response) {
  const body = reviewEvpKeySchema.parse(req.body);
  const correlation = correlationId(req);
  const result = await reviewService.reviewEvpKey(actorId(req), req.params.versionId, { ...body, idempotencyKey: idempotencyKey(req), correlationId: correlation });
  return response(res, correlation, result, result.replayed ? 200 : 201);
}
export async function secondApproveEvpKey(req: Request, res: Response) {
  const body = secondApproveEvpKeySchema.parse(req.body);
  const correlation = correlationId(req);
  const result = await reviewService.secondApproveEvpKey(actorId(req), req.params.versionId, { ...body, idempotencyKey: idempotencyKey(req), correlationId: correlation });
  return response(res, correlation, result, result.replayed ? 200 : 201);
}
