"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationsController = void 0;
const donations_service_1 = require("./donations.service");
const donations_validator_1 = require("./donations.validator");
class DonationsController {
    static async create(req, res) {
        const { familyId } = donations_validator_1.createDonationSchema.parse(req.body);
        const result = await donations_service_1.DonationsService.create(familyId, req.user);
        return res.status(201).json(result);
    }
    static async batch(req, res) {
        const { familyIds } = donations_validator_1.batchDonationSchema.parse(req.body);
        const results = await donations_service_1.DonationsService.createBatch(familyIds, req.user);
        return res.status(201).json(results);
    }
    static async listMe(req, res) {
        const history = await donations_service_1.DonationsService.listMyDonations(req.user.id);
        return res.json(history);
    }
}
exports.DonationsController = DonationsController;
