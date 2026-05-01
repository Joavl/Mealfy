"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationsService = void 0;
const uuid_1 = require("uuid");
const mock_db_1 = require("../../database/mock-db");
const AppError_1 = require("../../shared/errors/AppError");
class DonationsService {
    static calculateAmount(childrenCount) {
        if (childrenCount === 1)
            return 30;
        if (childrenCount === 2)
            return 40;
        return 50; // 3+ children
    }
    static async create(familyId, donor) {
        const families = await mock_db_1.MockDatabase.read('families');
        const fIdx = families.findIndex(f => f.id === familyId);
        if (fIdx === -1)
            throw new AppError_1.AppError('Family not found', 404);
        const family = families[fIdx];
        const amount = this.calculateAmount(family.childrenCount);
        const donation = {
            id: `don-${(0, uuid_1.v4)()}`,
            donorId: donor.id,
            familyId: family.id,
            amount,
            createdAt: new Date().toISOString()
        };
        const giftCard = {
            id: `gc-${(0, uuid_1.v4)()}`,
            donationId: donation.id,
            provider: 'ifood',
            code: `MEALFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            amount,
            status: 'generated',
            createdAt: new Date().toISOString()
        };
        // Update family status
        families[fIdx].supportStatus = 'fed';
        families[fIdx].lastFedAt = new Date().toISOString();
        // Update donor total
        const users = await mock_db_1.MockDatabase.read('users');
        const uIdx = users.findIndex(u => u.id === donor.id);
        if (uIdx !== -1) {
            users[uIdx].totalDonated += amount;
        }
        const donations = await mock_db_1.MockDatabase.read('donations');
        const giftCards = await mock_db_1.MockDatabase.read('giftcards');
        donations.unshift(donation);
        giftCards.unshift(giftCard);
        await mock_db_1.MockDatabase.write('families', families);
        await mock_db_1.MockDatabase.write('users', users);
        await mock_db_1.MockDatabase.write('donations', donations);
        await mock_db_1.MockDatabase.write('giftcards', giftCards);
        await mock_db_1.MockDatabase.appendAuditLog({ type: 'CREATE_DONATION', donationId: donation.id, donorId: donor.id, amount });
        return { donation, giftCard };
    }
    static async createBatch(familyIds, donor) {
        const results = [];
        for (const id of familyIds) {
            try {
                const res = await this.create(id, donor);
                results.push(res);
            }
            catch (e) {
                console.error(`Failed to donate to ${id}`, e);
            }
        }
        return results;
    }
    static async listMyDonations(userId) {
        const donations = await mock_db_1.MockDatabase.read('donations');
        const giftCards = await mock_db_1.MockDatabase.read('giftcards');
        const families = await mock_db_1.MockDatabase.read('families');
        return donations
            .filter(d => d.donorId === userId)
            .map(d => ({
            ...d,
            giftCard: giftCards.find(gc => gc.donationId === d.id),
            family: families.find(f => f.id === d.familyId)
        }));
    }
}
exports.DonationsService = DonationsService;
