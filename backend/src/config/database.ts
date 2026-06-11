import { PrismaClient } from '@prisma/client';
import { env } from './env';

let prisma: PrismaClient;

if (env.DATABASE_MODE === 'prisma') {
  prisma = new PrismaClient();
} else {
  // Mock fallback for in-memory / JSON mode in development
  prisma = null as any;
}

export { prisma };
