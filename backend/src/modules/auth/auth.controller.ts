import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { registerDonorSchema, registerEntitySchema, registerBeneficiarySchema, loginSchema } from './auth.validator';

export class AuthController {
  static async registerDonor(req: Request, res: Response) {
    const data = registerDonorSchema.parse(req.body);
    const user = await AuthService.registerDonor(data);
    return res.status(201).json(user);
  }

  static async registerEntity(req: Request, res: Response) {
    const data = registerEntitySchema.parse(req.body);
    const user = await AuthService.registerEntity(data);
    return res.status(201).json(user);
  }

  static async registerBeneficiary(req: Request, res: Response) {
    const data = registerBeneficiarySchema.parse(req.body);
    const result = await AuthService.registerBeneficiary(data);
    return res.status(201).json(result);
  }

  static async login(req: Request, res: Response) {
    const { email, password } = loginSchema.parse(req.body);
    const user = await AuthService.login(email, password);
    return res.json({
      token: user.id, // Emitting user ID as mock token
      user
    });
  }

  static async me(req: Request, res: Response) {
    return res.json(req.user);
  }

  static async updatePreferences(req: Request, res: Response) {
    const preferences = req.body;
    const user = await AuthService.updatePreferences(req.user.id, preferences);
    return res.json(user);
  }
}
