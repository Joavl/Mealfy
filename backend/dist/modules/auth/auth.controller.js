"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const auth_validator_1 = require("./auth.validator");
class AuthController {
    static async registerDonor(req, res) {
        const data = auth_validator_1.registerDonorSchema.parse(req.body);
        const user = await auth_service_1.AuthService.registerDonor(data);
        return res.status(201).json(user);
    }
    static async registerEntity(req, res) {
        const data = auth_validator_1.registerEntitySchema.parse(req.body);
        const user = await auth_service_1.AuthService.registerEntity(data);
        return res.status(201).json(user);
    }
    static async login(req, res) {
        const { email } = auth_validator_1.loginSchema.parse(req.body);
        const user = await auth_service_1.AuthService.login(email);
        return res.json({
            token: user.id, // Emitting user ID as mock token
            user
        });
    }
    static async me(req, res) {
        return res.json(req.user);
    }
}
exports.AuthController = AuthController;
