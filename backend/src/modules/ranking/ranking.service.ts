import { FeaturedDonorsService } from '../admin/featured-donors.service';

export class RankingService {
  static async getGlobalRanking(): Promise<any[]> {
    return FeaturedDonorsService.getRankingWithFeatured();
  }
}
