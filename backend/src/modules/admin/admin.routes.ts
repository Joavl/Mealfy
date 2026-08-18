import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import { getAuditLogs, approveEntity, blockEntity, listEntities, listUsers } from './admin.controller';

// Montado em /admin — somente admin.
export const adminRoutes = Router();

adminRoutes.use(authGuard, roleGuard('admin'));

adminRoutes.get('/audit-logs', getAuditLogs);
adminRoutes.get('/entities', listEntities);
adminRoutes.get('/users', listUsers);
adminRoutes.post('/entities/:id/approve', approveEntity);
adminRoutes.post('/entities/:id/block', blockEntity);
