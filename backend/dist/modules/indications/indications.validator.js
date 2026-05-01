"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateIndicationStatusSchema = exports.createIndicationSchema = void 0;
const zod_1 = require("zod");
exports.createIndicationSchema = zod_1.z.object({
    representativeName: zod_1.z.string().min(3),
    region: zod_1.z.string().min(3),
    childrenCount: zod_1.z.number().int().min(0),
    observation: zod_1.z.string(),
});
exports.updateIndicationStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'approved', 'rejected', 'converted']),
});
