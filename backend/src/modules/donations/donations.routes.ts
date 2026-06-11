import { Router } from 'express';
import { DonationsController } from './donations.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/role.middleware';

const donationsRoutes = Router();

donationsRoutes.post('/', authMiddleware, roleGuard(['donor']), DonationsController.create);
donationsRoutes.post('/batch', authMiddleware, roleGuard(['donor']), DonationsController.batch);
donationsRoutes.post('/regional', authMiddleware, roleGuard(['donor']), DonationsController.regional);
donationsRoutes.get('/me', authMiddleware, roleGuard(['donor']), DonationsController.listMe);

export { donationsRoutes };
