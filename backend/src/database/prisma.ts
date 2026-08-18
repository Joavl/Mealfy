import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

/**
 * Instância única do Prisma Client (evita esgotar conexões em dev/hot-reload).
 */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export type DatabaseStatus = 'connected' | 'disconnected' | 'not_configured';

/**
 * Testa a conexão com o banco para o healthcheck.
 * Sem DATABASE_URL configurada, retorna 'not_configured' (não tenta conectar).
 */
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  if (!env.DATABASE_URL) return 'not_configured';
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'connected';
  } catch {
    return 'disconnected';
  }
}
