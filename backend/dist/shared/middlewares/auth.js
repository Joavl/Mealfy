"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const mock_db_1 = require("../../database/mock-db");
const AppError_1 = require("../errors/AppError");
const authMiddleware = async (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.headers['authorization']?.toString().replace('Bearer ', '');
    if (!userId) {
        throw new AppError_1.AppError('Authentication required', 401);
    }
    const users = await mock_db_1.MockDatabase.read('users');
    const user = users.find((u) => u.id === userId);
    if (!user) {
        throw new AppError_1.AppError('User not found or invalid session', 401);
    }
    req.user = user;
    next();
};
exports.authMiddleware = authMiddleware;
