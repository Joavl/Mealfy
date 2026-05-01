"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleGuard = void 0;
const AppError_1 = require("../errors/AppError");
const roleGuard = (allowedRoles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            throw new AppError_1.AppError('Authentication required', 401);
        }
        if (!allowedRoles.includes(user.role)) {
            throw new AppError_1.AppError('Permission denied', 403);
        }
        next();
    };
};
exports.roleGuard = roleGuard;
