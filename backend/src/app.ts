import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './shared/middlewares/errorHandler';

import { authRoutes } from './modules/auth/auth.routes';
import { familiesRoutes } from './modules/families/families.routes';
import { indicationsRoutes } from './modules/indications/indications.routes';
import { donationsRoutes } from './modules/donations/donations.routes';
import { rankingRoutes } from './modules/ranking/ranking.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { regionsRoutes } from './modules/regions/regions.routes';
import { socialRoutes } from './modules/social/social.routes';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/families', familiesRoutes);
app.use('/indications', indicationsRoutes);
app.use('/donations', donationsRoutes);
app.use('/ranking', rankingRoutes);
app.use('/admin', adminRoutes);
app.use('/regions', regionsRoutes);
app.use('/social', socialRoutes);

app.use(errorHandler);

export { app };
