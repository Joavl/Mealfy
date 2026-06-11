import { app } from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`🚀 Mealfy Backend running on port ${env.PORT} (mode: ${env.NODE_ENV}, auth: ${env.AUTH_MODE}, db: ${env.DATABASE_MODE})`);
});
