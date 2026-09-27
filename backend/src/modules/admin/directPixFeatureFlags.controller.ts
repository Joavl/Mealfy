import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { correlationIdSchema } from '../directPix/terms.validator';
import { directPixFeatureFlagKeySchema, updateDirectPixFeatureFlagSchema } from '../directPix/featureFlags.validator';
import { listDirectPixFeatureFlags, updateDirectPixFeatureFlag } from '../directPix/featureFlags.service';

function actorId(req: Request) { if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated'); return req.auth.userId; }
function correlationId(req: Request) { const value = req.header('X-Correlation-Id'); if (!value) return randomUUID(); const parsed = correlationIdSchema.safeParse(value); if (!parsed.success) throw new AppError('X-Correlation-Id inválido.', 422, 'invalid_correlation_id'); return parsed.data; }
export async function getDirectPixFeatureFlags(_req: Request, res: Response) { res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' }); return res.json({ flags: await listDirectPixFeatureFlags() }); }
export async function patchDirectPixFeatureFlag(req: Request, res: Response) { const key = directPixFeatureFlagKeySchema.parse(req.params.key); const requestCorrelationId = correlationId(req); const flag = await updateDirectPixFeatureFlag(actorId(req), { key, ...updateDirectPixFeatureFlagSchema.parse(req.body), correlationId: requestCorrelationId }); res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache', 'X-Correlation-Id': requestCorrelationId }); return res.json({ flag }); }
