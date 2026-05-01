"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RankingService = void 0;
const mock_db_1 = require("../../database/mock-db");
class RankingService {
    static async getGlobalRanking() {
        const users = await mock_db_1.MockDatabase.read('users');
        // Only donors who want to show on ranking
        const ranking = users
            .filter(u => u.role === 'donor' && u.privacySettings?.showOnRanking !== false)
            .map(u => {
            if (u.privacySettings?.anonymousMode) {
                return {
                    id: u.id,
                    name: 'Doador Anônimo',
                    avatar: '👤',
                    totalDonated: u.totalDonated,
                    isAnonymous: true
                };
            }
            return {
                id: u.id,
                name: u.name,
                totalDonated: u.totalDonated,
                instagram: u.privacySettings?.showInstagram ? u.email : undefined, // Using email as mock instagram link
                isAnonymous: false
            };
        })
            .sort((a, b) => b.totalDonated - a.totalDonated);
        return ranking;
    }
}
exports.RankingService = RankingService;
