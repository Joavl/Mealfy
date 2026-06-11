import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorMiddleware } from './middlewares/error.middleware';

import { authRoutes } from './modules/auth/auth.routes';
import { familiesRoutes } from './modules/families/families.routes';
import { indicationsRoutes } from './modules/indications/indications.routes';
import { donationsRoutes } from './modules/donations/donations.routes';
import { rankingRoutes } from './modules/ranking/ranking.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { regionsRoutes } from './modules/regions/regions.routes';
import { socialRoutes } from './modules/social/social.routes';
import { giftcardsRoutes } from './modules/giftcards/giftcards.routes';

const app = express();

const origins = env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : ['*'];

app.use(cors({
  origin: origins,
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/families', familiesRoutes);
app.use('/api/indications', indicationsRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/regions', regionsRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/giftcards', giftcardsRoutes);

app.use(errorMiddleware);

export { app };
