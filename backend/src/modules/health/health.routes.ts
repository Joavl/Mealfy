import { Router } from 'express';
import { getHealth } from './health.controller';

export const healthRoutes = Router();

// GET /health
healthRoutes.get('/', getHealth);
