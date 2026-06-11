import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const authRoutes = Router();

authRoutes.post('/register/donor', AuthController.registerDonor);
authRoutes.post('/register/entity', AuthController.registerEntity);
authRoutes.post('/register/beneficiary', AuthController.registerBeneficiary);
authRoutes.post('/login/mock', AuthController.login);
authRoutes.post('/login/firebase', AuthController.loginFirebase);
authRoutes.get('/me', authMiddleware, AuthController.me);
authRoutes.patch('/me/preferences', authMiddleware, AuthController.updatePreferences);

export { authRoutes };
