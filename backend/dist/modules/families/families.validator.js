"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFamilyStatusSchema = exports.createFamilySchema = void 0;
const zod_1 = require("zod");
exports.createFamilySchema = zod_1.z.object({
    representativeName: zod_1.z.string().min(3),
    neighborhood: zod_1.z.string().min(3),
    city: zod_1.z.string(),
    state: zod_1.z.string().length(2),
    shortAddress: zod_1.z.string(),
    description: zod_1.z.string(),
    childrenCount: zod_1.z.number().int().min(1),
    mainNeed: zod_1.z.string(),
    latitude: zod_1.z.number(),
    longitude: zod_1.z.number(),
});
exports.updateFamilyStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
    supportStatus: zod_1.z.enum(['needs_help', 'fed', 'rejected', 'suspended']).optional(),
});
