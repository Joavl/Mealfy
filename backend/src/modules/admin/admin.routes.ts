import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AdminService } from './admin.service';
import { FeaturedDonorsService } from './featured-donors.service';
import { authMiddleware } from '../../shared/middlewares/auth';
import { roleGuard } from '../../shared/middlewares/roleGuard';

const adminRoutes = Router();

adminRoutes.use(authMiddleware, roleGuard(['admin']));

adminRoutes.get('/entities/pending', async (req: Request, res: Response) => {
  const pending = await AdminService.listPendingEntities();
  return res.json(pending);
});

adminRoutes.patch('/entities/:id/approve', async (req: Request, res: Response) => {
  await AdminService.approveEntity(req.params.id as string);
  return res.json({ message: 'Entity approved successfully' });
});

adminRoutes.patch('/entities/:id/reject', async (req: Request, res: Response) => {
  await AdminService.rejectEntity(req.params.id as string);
  return res.json({ message: 'Entity rejected successfully' });
});

adminRoutes.get('/featured-donors', async (_req: Request, res: Response) => {
  const config = await FeaturedDonorsService.getConfig();
  return res.json(config);
});

adminRoutes.put('/featured-donors', async (req: Request, res: Response) => {
  const body = z.object({ donorIds: z.array(z.string()).max(20) }).parse(req.body);
  const config = await FeaturedDonorsService.saveConfig(body.donorIds, req.user?.id);
  return res.json(config);
});

adminRoutes.get('/donors', async (_req: Request, res: Response) => {
  const donors = await FeaturedDonorsService.listDonorsForPicker();
  return res.json(donors);
});

export { adminRoutes };
