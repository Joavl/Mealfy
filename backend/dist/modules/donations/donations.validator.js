"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchDonationSchema = exports.createDonationSchema = void 0;
const zod_1 = require("zod");
exports.createDonationSchema = zod_1.z.object({
    familyId: zod_1.z.string(),
    amount: zod_1.z.number().positive(),
});
exports.batchDonationSchema = zod_1.z.object({
    familyIds: zod_1.z.array(zod_1.z.string()),
});
