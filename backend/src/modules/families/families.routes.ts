import { Router } from 'express';
import { FamiliesController } from './families.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/role.middleware';

const familiesRoutes = Router();

familiesRoutes.get('/public', FamiliesController.getPublic);
familiesRoutes.get('/awaiting-entity', authMiddleware, roleGuard(['entity']), FamiliesController.getAwaitingEntity);
familiesRoutes.get('/:id', authMiddleware, FamiliesController.getById);
familiesRoutes.post('/', authMiddleware, roleGuard(['entity', 'admin']), FamiliesController.create);
familiesRoutes.patch('/:id/status', authMiddleware, roleGuard(['admin']), FamiliesController.updateStatus);
familiesRoutes.patch('/:id/assign-entity', authMiddleware, roleGuard(['entity']), FamiliesController.assignEntity);

export { familiesRoutes };
