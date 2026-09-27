import { createApp } from './app';
import { env } from './config/env';
import { DirectPixOutboxWorker, directPixJobsEnabled } from './modules/directPix/outbox.worker';
import { DirectPixPrivacyRetentionWorker } from './modules/directPix/privacy.service';
import { DirectPixFollowUpScheduler } from './modules/directPix/followUpScheduler.service';

const app = createApp();
const directPixOutboxWorker = new DirectPixOutboxWorker();
const directPixPrivacyRetentionWorker = new DirectPixPrivacyRetentionWorker();
const directPixFollowUpScheduler = new DirectPixFollowUpScheduler();

void directPixJobsEnabled().then((enabled) => {
  if (enabled) {
    directPixOutboxWorker.start();
    directPixPrivacyRetentionWorker.start();
    directPixFollowUpScheduler.start();
    console.log('[mealfy-backend] direct Pix workers enabled');
  }
});

const server = app.listen(env.PORT, () => {
  // Railway/Render injetam PORT automaticamente; respeitamos process.env.PORT via env.
  console.log(`[mealfy-backend] online em http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Encerramento gracioso
const shutdown = (signal: string) => {
  console.log(`[mealfy-backend] recebido ${signal}, encerrando...`);
  directPixOutboxWorker.stop();
  directPixPrivacyRetentionWorker.stop();
  directPixFollowUpScheduler.stop();
  server.close(() => process.exit(0));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
