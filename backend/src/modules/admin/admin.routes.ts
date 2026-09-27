import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import {
  getAuditLogs, approveEntity, blockEntity, getRankingStories, listEntities, listUsers, listEntityOperators, putRankingStories,
} from './admin.controller';
import { getDirectPixFeatureFlags, patchDirectPixFeatureFlag } from './directPixFeatureFlags.controller';

// Montado em /admin — somente admin.
export const adminRoutes = Router();

adminRoutes.use(authGuard, roleGuard('admin'));

adminRoutes.get('/audit-logs', getAuditLogs);
adminRoutes.get('/direct-pix/feature-flags', getDirectPixFeatureFlags);
adminRoutes.patch('/direct-pix/feature-flags/:key', patchDirectPixFeatureFlag);
adminRoutes.get('/entities', listEntities);
adminRoutes.get('/entities/:id/operators', listEntityOperators);
adminRoutes.get('/users', listUsers);
adminRoutes.get('/ranking-stories', getRankingStories);
adminRoutes.put('/ranking-stories', putRankingStories);
adminRoutes.post('/entities/:id/approve', approveEntity);
adminRoutes.post('/entities/:id/block', blockEntity);
