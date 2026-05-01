"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamiliesController = void 0;
const families_service_1 = require("./families.service");
const families_validator_1 = require("./families.validator");
class FamiliesController {
    static async getPublic(req, res) {
        const families = await families_service_1.FamiliesService.getPublicFamilies();
        return res.json(families);
    }
    static async getById(req, res) {
        const family = await families_service_1.FamiliesService.getFamilyById(req.params.id);
        return res.json(family);
    }
    static async create(req, res) {
        const data = families_validator_1.createFamilySchema.parse(req.body);
        const family = await families_service_1.FamiliesService.createFamily(data, req.user);
        return res.status(201).json(family);
    }
    static async updateStatus(req, res) {
        const data = families_validator_1.updateFamilyStatusSchema.parse(req.body);
        const family = await families_service_1.FamiliesService.updateStatus(req.params.id, data);
        return res.json(family);
    }
}
exports.FamiliesController = FamiliesController;
