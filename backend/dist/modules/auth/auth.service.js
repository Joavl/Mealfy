"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const uuid_1 = require("uuid");
const mock_db_1 = require("../../database/mock-db");
const AppError_1 = require("../../shared/errors/AppError");
class AuthService {
    static async registerDonor(data) {
        const users = await mock_db_1.MockDatabase.read('users');
        if (users.find(u => u.email === data.email)) {
            throw new AppError_1.AppError('Email already registered', 409);
        }
        const newUser = {
            id: `u-${(0, uuid_1.v4)()}`,
            name: data.name,
            email: data.email,
            role: 'donor',
            documentType: data.documentType,
            documentNumber: data.documentNumber,
            totalDonated: 0,
            status: 'active',
            privacySettings: {
                showOnRanking: true,
                showInstagram: false,
                anonymousMode: false
            }
        };
        users.push(newUser);
        await mock_db_1.MockDatabase.write('users', users);
        await mock_db_1.MockDatabase.appendAuditLog({ type: 'REGISTER_DONOR', userId: newUser.id });
        return newUser;
    }
    static async registerEntity(data) {
        const users = await mock_db_1.MockDatabase.read('users');
        const entities = await mock_db_1.MockDatabase.read('entities');
        if (users.find(u => u.email === data.email)) {
            throw new AppError_1.AppError('Email already registered', 409);
        }
        const entityId = `e-${(0, uuid_1.v4)()}`;
        const userId = `u-${(0, uuid_1.v4)()}`;
        const newEntity = {
            id: entityId,
            name: data.name,
            cnpj: data.cnpj,
            region: data.region,
            type: data.type,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        const newUser = {
            id: userId,
            name: data.name,
            email: data.email,
            role: 'entity',
            entityId: entityId,
            totalDonated: 0,
            status: 'pending'
        };
        users.push(newUser);
        entities.push(newEntity);
        await mock_db_1.MockDatabase.write('users', users);
        await mock_db_1.MockDatabase.write('entities', entities);
        await mock_db_1.MockDatabase.appendAuditLog({ type: 'REGISTER_ENTITY', userId, entityId });
        return newUser;
    }
    static async login(email) {
        const users = await mock_db_1.MockDatabase.read('users');
        const user = users.find(u => u.email === email);
        if (!user) {
            throw new AppError_1.AppError('Invalid credentials', 401);
        }
        return user;
    }
}
exports.AuthService = AuthService;
