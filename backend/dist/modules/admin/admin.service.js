"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const mock_db_1 = require("../../database/mock-db");
const AppError_1 = require("../../shared/errors/AppError");
class AdminService {
    static async listPendingEntities() {
        const users = await mock_db_1.MockDatabase.read('users');
        const entities = await mock_db_1.MockDatabase.read('entities');
        return users
            .filter(u => u.role === 'entity' && u.status === 'pending')
            .map(u => ({
            ...u,
            entityData: entities.find((e) => e.id === u.entityId)
        }));
    }
    static async approveEntity(userId) {
        const users = await mock_db_1.MockDatabase.read('users');
        const entities = await mock_db_1.MockDatabase.read('entities');
        const uIdx = users.findIndex(u => u.id === userId);
        if (uIdx === -1)
            throw new AppError_1.AppError('User not found', 404);
        users[uIdx].status = 'approved';
        const eIdx = entities.findIndex((e) => e.id === users[uIdx].entityId);
        if (eIdx !== -1) {
            entities[eIdx].status = 'approved';
        }
        await mock_db_1.MockDatabase.write('users', users);
        await mock_db_1.MockDatabase.write('entities', entities);
        await mock_db_1.MockDatabase.appendAuditLog({ type: 'APPROVE_ENTITY', userId });
    }
    static async rejectEntity(userId) {
        const users = await mock_db_1.MockDatabase.read('users');
        const uIdx = users.findIndex(u => u.id === userId);
        if (uIdx === -1)
            throw new AppError_1.AppError('User not found', 404);
        users[uIdx].status = 'rejected';
        await mock_db_1.MockDatabase.write('users', users);
        await mock_db_1.MockDatabase.appendAuditLog({ type: 'REJECT_ENTITY', userId });
    }
}
exports.AdminService = AdminService;
