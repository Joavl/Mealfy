import { Request, Response } from 'express';
import { DonationsService } from './donations.service';
import { FamiliesService } from '../families/families.service';
import { createDonationSchema, batchDonationSchema, regionalDonationSchema } from './donations.validator';

export class DonationsController {
  static async create(req: Request, res: Response) {
    const { familyId, amount, message, communityId } = createDonationSchema.parse(req.body);
    const result = await DonationsService.create(familyId, req.user, amount, message, communityId);
    const family = await FamiliesService.getFamilyById(familyId).catch(() => null);

    return res.status(201).json({
      donation: { ...result.donation, giftCardId: result.giftCard.id, communityId },
      giftCard: result.giftCard,
      familyAssigned: family ?? { id: familyId, representativeName: 'Família' },
    });
  }

  static async batch(req: Request, res: Response) {
    const { familyIds, amountPerFamily } = batchDonationSchema.parse(req.body);
    const results = await DonationsService.createBatch(familyIds, req.user, amountPerFamily);
    return res.status(201).json(results);
  }

  static async regional(req: Request, res: Response) {
    const { communityId, totalAmount } = regionalDonationSchema.parse(req.body);
    const result = await DonationsService.createRegional(communityId, totalAmount, req.user);
    return res.status(201).json(result);
  }

  static async listMe(req: Request, res: Response) {
    const history = await DonationsService.listMyDonations(req.user.id);
    return res.json(history);
  }
}
