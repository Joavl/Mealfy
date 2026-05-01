"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndicationsController = void 0;
const indications_service_1 = require("./indications.service");
const indications_validator_1 = require("./indications.validator");
class IndicationsController {
    static async create(req, res) {
        const data = indications_validator_1.createIndicationSchema.parse(req.body);
        const indication = await indications_service_1.IndicationsService.create(data, req.user.id);
        return res.status(201).json(indication);
    }
    static async list(req, res) {
        const indications = await indications_service_1.IndicationsService.listAll();
        return res.json(indications);
    }
    static async convert(req, res) {
        const family = await indications_service_1.IndicationsService.convertToFamily(req.params.id, req.user);
        return res.status(201).json(family);
    }
    static async updateStatus(req, res) {
        const { status } = indications_validator_1.updateIndicationStatusSchema.parse(req.body);
        const indication = await indications_service_1.IndicationsService.updateStatus(req.params.id, status);
        return res.json(indication);
    }
}
exports.IndicationsController = IndicationsController;
