import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors/AppError';
import { correlationIdSchema, idempotencyKeySchema } from './terms.validator';
import { assistedReceiptResponseSchema, cancelDeclarationSchema, responsibleReceiptResponseSchema } from './receiptResponse.validator';
import * as service from './receiptResponse.service';

const stepUpTokenSchema = z.string().min(32).max(256);
function actor(req: Request) { if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated'); return req.auth; }
function header(req: Request, name: string, schema: z.ZodType<string>, missing: string, invalid: string) { const raw = req.header(name); if (!raw) throw new AppError(name + ' é obrigatório.', 422, missing); const parsed = schema.safeParse(raw); if (!parsed.success) throw new AppError(name + ' inválido.', 422, invalid); return parsed.data; }
function idempotencyKey(req: Request) { return header(req, 'Idempotency-Key', idempotencyKeySchema, 'idempotency_key_required', 'invalid_idempotency_key'); }
function correlationId(req: Request) { const provided = req.header('X-Correlation-Id'); return provided ? header(req, 'X-Correlation-Id', correlationIdSchema, 'invalid_correlation_id', 'invalid_correlation_id') : randomUUID(); }
function send(res: Response, correlation: string, result: { replayed: boolean }, created = true) { res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache', 'X-Correlation-Id': correlation }); if (result.replayed) res.setHeader('Idempotency-Replayed', 'true'); return res.status(result.replayed ? 200 : created ? 201 : 200).json(result); }

export async function cancelDonorDeclaration(req: Request, res: Response) { const correlation = correlationId(req); const result = await service.cancelDonorDeclaration(actor(req).userId, req.params.intentId, { ...cancelDeclarationSchema.parse(req.body), idempotencyKey: idempotencyKey(req), correlationId: correlation }); return send(res, correlation, result); }
export async function confirmReceiptByResponsible(req: Request, res: Response) { const auth = actor(req); const correlation = correlationId(req); const result = await service.confirmReceiptByResponsible(auth.userId, auth.role, req.params.intentId, { ...responsibleReceiptResponseSchema.parse(req.body), idempotencyKey: idempotencyKey(req), correlationId: correlation, stepUpAuthorization: header(req, 'X-Step-Up-Authorization', stepUpTokenSchema, 'step_up_authorization_required', 'invalid_step_up_authorization') }); return send(res, correlation, result); }
export async function recordAssistedReceiptResponse(req: Request, res: Response) { const auth = actor(req); const correlation = correlationId(req); const result = await service.recordAssistedReceiptResponse(auth.userId, auth.role, req.params.intentId, { ...assistedReceiptResponseSchema.parse(req.body), idempotencyKey: idempotencyKey(req), correlationId: correlation }); return send(res, correlation, result); }
export async function listEntityFollowUpCases(req: Request, res: Response) { const cases = await service.listEntityFollowUpCases(actor(req).userId); return res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' }).json({ cases }); }
