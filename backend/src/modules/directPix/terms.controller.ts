import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { toCurrentTermsDto, toTermsAcceptanceDto } from './terms.dto';
import { acceptDirectPixTermsSchema, correlationIdSchema, idempotencyKeySchema } from './terms.validator';
import * as termsService from './terms.service';

function donorOf(req: Request) {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  return req.auth;
}

function idempotencyKeyOf(req: Request): string {
  const raw = req.header('Idempotency-Key');
  if (!raw) throw new AppError('Idempotency-Key é obrigatória.', 422, 'idempotency_key_required');
  const parsed = idempotencyKeySchema.safeParse(raw);
  if (!parsed.success) throw new AppError('Idempotency-Key inválida.', 422, 'invalid_idempotency_key');
  return parsed.data;
}

function correlationIdOf(req: Request): string {
  const raw = req.header('X-Correlation-Id');
  if (!raw) return randomUUID();
  const parsed = correlationIdSchema.safeParse(raw);
  if (!parsed.success) throw new AppError('X-Correlation-Id inválido.', 422, 'invalid_correlation_id');
  return parsed.data;
}

export async function getCurrentTerms(req: Request, res: Response): Promise<Response> {
  const actor = donorOf(req);
  const { terms, acceptedAt } = await termsService.currentTerms(actor.userId);
  return res.json({ terms: toCurrentTermsDto(terms, acceptedAt) });
}

export async function acceptCurrentTerms(req: Request, res: Response): Promise<Response> {
  const actor = donorOf(req);
  const body = acceptDirectPixTermsSchema.parse(req.body);
  const correlationId = correlationIdOf(req);
  const result = await termsService.acceptTerms({
    actor,
    version: body.version,
    idempotencyKey: idempotencyKeyOf(req),
    correlationId,
  });
  res.setHeader('X-Correlation-Id', result.acceptance.correlationId);
  if (result.replayed) res.setHeader('Idempotency-Replayed', 'true');
  return res.status(201).json({ acceptance: toTermsAcceptanceDto(result.acceptance) });
}
