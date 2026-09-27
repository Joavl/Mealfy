import { createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';

const WINDOW_MS = 15 * 60 * 1000;
const ACTOR_LIMIT = 10;
const ORIGIN_LIMIT = 60;
const PURPOSES = new Set(['view_pix_key', 'change_pix_key', 'revoke_pix_key', 'confirm_direct_pix_receipt']);

function digest(value: string): string { return createHash('sha256').update(value).digest('hex'); }

async function consume(keyHash: string, limit: number): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ hitCount: number }>>`
    INSERT INTO "auth_rate_limits" ("keyHash", "hitCount", "windowStartedAt", "expiresAt")
    VALUES (${keyHash}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
    ON CONFLICT ("keyHash") DO UPDATE SET
      "hitCount" = CASE WHEN "auth_rate_limits"."expiresAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "auth_rate_limits"."hitCount" + 1 END,
      "windowStartedAt" = CASE WHEN "auth_rate_limits"."expiresAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP ELSE "auth_rate_limits"."windowStartedAt" END,
      "expiresAt" = CASE WHEN "auth_rate_limits"."expiresAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE "auth_rate_limits"."expiresAt" END
    RETURNING "hitCount"
  `;
  return rows[0].hitCount <= limit;
}

/** Shared PostgreSQL limits by authenticated actor, trusted proxy IP and closed purpose. */
export async function stepUpRateLimit(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  const suppliedPurpose = String(req.body?.purpose ?? '');
  const purpose = PURPOSES.has(suppliedPurpose) ? suppliedPurpose : 'invalid';
  const actorKey = digest('actor:' + req.auth.userId + ':' + purpose);
  const originKey = digest('origin:' + ipKeyGenerator(req.ip ?? 'unknown') + ':' + purpose);
  const [actorAllowed, originAllowed] = await Promise.all([
    consume(actorKey, ACTOR_LIMIT), consume(originKey, ORIGIN_LIMIT),
  ]);
  if (!actorAllowed || !originAllowed) {
    throw new AppError('Não foi possível validar a autenticação reforçada.', 429, 'step_up_failed');
  }
  next();
}
