"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerEntitySchema = exports.registerDonorSchema = void 0;
const zod_1 = require("zod");
exports.registerDonorSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6), // Password logic is mock but schema exists
    documentType: zod_1.z.enum(['cpf', 'cnpj']),
    documentNumber: zod_1.z.string().min(11),
});
exports.registerEntitySchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    cnpj: zod_1.z.string().min(14),
    region: zod_1.z.string().min(3),
    type: zod_1.z.enum(['ONG', 'igreja', 'escola', 'instituto']),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
