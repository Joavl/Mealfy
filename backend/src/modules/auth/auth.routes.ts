import { Router } from 'express';
import { register, login } from './auth.controller';

export const authRoutes = Router();

authRoutes.post('/register', register);
authRoutes.post('/login', login);
