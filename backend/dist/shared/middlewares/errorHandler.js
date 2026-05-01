"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const AppError_1 = require("../errors/AppError");
const zod_1 = require("zod");
const errorHandler = (err, request, response, _next) => {
    if (err instanceof AppError_1.AppError) {
        return response.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
    }
    if (err instanceof zod_1.ZodError) {
        return response.status(400).json({
            status: 'error',
            message: 'Validation error',
            issues: err.issues,
        });
    }
    console.error(err);
    return response.status(500).json({
        status: 'error',
        message: 'Internal server error',
    });
};
exports.errorHandler = errorHandler;
