import { Router, Request, Response } from 'express';
import { GiftCardsService } from './giftcards.service';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/role.middleware';

const giftcardsRoutes = Router();

giftcardsRoutes.get('/ifood/info', (req: Request, res: Response) => {
  const code = (req.query.code as string) || 'MEALFY-DEMO';
  return res.json(GiftCardsService.getIfoodInfo(code));
});

giftcardsRoutes.get(
  '/family/:familyId',
  authMiddleware,
  async (req: Request, res: Response) => {
    const list = await GiftCardsService.listByFamily(req.params.familyId as string);
    return res.json(list);
  },
);

giftcardsRoutes.get(
  '/family/:familyId/active',
  authMiddleware,
  async (req: Request, res: Response) => {
    const card = await GiftCardsService.getActiveForFamily(req.params.familyId as string);
    return res.json(card);
  },
);

giftcardsRoutes.post(
  '/:giftCardId/redeem',
  authMiddleware,
  roleGuard(['beneficiary']),
  async (req: Request, res: Response) => {
    const result = await GiftCardsService.redeem(req.params.giftCardId as string, req.user!);
    return res.json(result);
  },
);

export { giftcardsRoutes };
