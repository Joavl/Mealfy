import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

const server = app.listen(env.PORT, () => {
  // Railway/Render injetam PORT automaticamente; respeitamos process.env.PORT via env.
  console.log(`[mealfy-backend] online em http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Encerramento gracioso
const shutdown = (signal: string) => {
  console.log(`[mealfy-backend] recebido ${signal}, encerrando...`);
  server.close(() => process.exit(0));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
