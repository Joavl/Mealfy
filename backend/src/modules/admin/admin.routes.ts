import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import {
  getAuditLogs, approveEntity, blockEntity, getRankingStories, listEntities, listUsers, listEntityOperators, putRankingStories,
} from './admin.controller';
import { getDirectPixFeatureFlags, patchDirectPixFeatureFlag } from './directPixFeatureFlags.controller';
import { applyLegacyDrain, dryRunLegacyDrain } from './legacyDrain.controller';
import { createSuspension, createBreakGlass, useBreakGlass } from '../directPix/suspension.controller';

// Montado em /admin — somente admin.
export const adminRoutes = Router();

adminRoutes.use(authGuard, roleGuard('admin'));

adminRoutes.get('/audit-logs', getAuditLogs);
adminRoutes.get('/direct-pix/feature-flags', getDirectPixFeatureFlags);
adminRoutes.patch('/direct-pix/feature-flags/:key', patchDirectPixFeatureFlag);
adminRoutes.post('/direct-pix/suspensions', createSuspension);
adminRoutes.post('/direct-pix/evp-key-versions/:versionId/break-glass-grants', createBreakGlass);
adminRoutes.get('/direct-pix/evp-key-versions/:versionId/break-glass', useBreakGlass);
adminRoutes.post('/direct-pix/legacy-drain/dry-run', dryRunLegacyDrain);
adminRoutes.post('/direct-pix/legacy-drain/apply', applyLegacyDrain);
adminRoutes.get('/entities', listEntities);
adminRoutes.get('/entities/:id/operators', listEntityOperators);
adminRoutes.get('/users', listUsers);
adminRoutes.get('/ranking-stories', getRankingStories);
adminRoutes.put('/ranking-stories', putRankingStories);
adminRoutes.post('/entities/:id/approve', approveEntity);
adminRoutes.post('/entities/:id/block', blockEntity);
