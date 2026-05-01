"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamiliesService = void 0;
const uuid_1 = require("uuid");
const mock_db_1 = require("../../database/mock-db");
const familyUtils_1 = require("../../shared/utils/familyUtils");
const AppError_1 = require("../../shared/errors/AppError");
class FamiliesService {
    static async getPublicFamilies() {
        const families = await mock_db_1.MockDatabase.read('families');
        return families.filter(familyUtils_1.isPubliclyVisibleFamily);
    }
    static async getFamilyById(id) {
        const families = await mock_db_1.MockDatabase.read('families');
        const family = families.find(f => f.id === id);
        if (!family)
            throw new AppError_1.AppError('Family not found', 404);
        return family;
    }
    static async createFamily(data, user) {
        const families = await mock_db_1.MockDatabase.read('families');
        // Check if user is approved entity
        if (user.role === 'entity' && user.status !== 'approved') {
            throw new AppError_1.AppError('Pending entities cannot register official families', 403);
        }
        const newFamily = {
            ...data,
            id: `f-${(0, uuid_1.v4)()}`,
            status: user.role === 'admin' ? 'approved' : (user.status === 'approved' ? 'approved' : 'pending'),
            supportStatus: 'needs_help',
            createdByEntityId: user.entityId,
            sourceType: 'entity',
            sourceLabel: `Cadastrado por ${user.name}`,
        };
        families.unshift(newFamily);
        await mock_db_1.MockDatabase.write('families', families);
        await mock_db_1.MockDatabase.appendAuditLog({ type: 'CREATE_FAMILY', familyId: newFamily.id, userId: user.id });
        return newFamily;
    }
    static async updateStatus(id, data) {
        const families = await mock_db_1.MockDatabase.read('families');
        const idx = families.findIndex(f => f.id === id);
        if (idx === -1)
            throw new AppError_1.AppError('Family not found', 404);
        families[idx] = { ...families[idx], ...data };
        await mock_db_1.MockDatabase.write('families', families);
        return families[idx];
    }
}
exports.FamiliesService = FamiliesService;
