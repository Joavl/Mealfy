import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  AUTH_MODE: z.enum(['firebase', 'mock']).default('firebase'),
  DATABASE_MODE: z.enum(['prisma', 'memory']).default('prisma'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

// Enforce security in production
if (env.NODE_ENV === 'production') {
  if (env.AUTH_MODE === 'mock' || env.DATABASE_MODE === 'memory') {
    console.error('❌ CRITICAL ERROR: Mock mode (AUTH_MODE=mock or DATABASE_MODE=memory) is strictly forbidden in production!');
    process.exit(1);
  }
  if (!env.DATABASE_URL && env.DATABASE_MODE === 'prisma') {
    console.error('❌ CRITICAL ERROR: DATABASE_URL is required when DATABASE_MODE=prisma in production!');
    process.exit(1);
  }
}
export type Env = z.infer<typeof envSchema>;
