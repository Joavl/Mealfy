import type { Request, Response } from 'express';
import { getDatabaseStatus } from '../../database/prisma';

/**
 * Healthcheck (liveness): sempre responde 200 enquanto a API estiver de pé,
 * incluindo o status atual da conexão com o banco (connected/disconnected/not_configured).
 * Útil para Railway/Render e para diagnosticar a conexão Postgres.
 */
export async function getHealth(_req: Request, res: Response): Promise<Response> {
  const database = await getDatabaseStatus();
  return res.json({
    status: 'ok',
    service: 'mealfy-backend',
    env: process.env.NODE_ENV ?? 'development',
    database,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
}
