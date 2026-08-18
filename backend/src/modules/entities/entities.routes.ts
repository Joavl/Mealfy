import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import { getDashboard, listFamilies, createFamily, updateFamily } from './entities.controller';

// Montado em /entity — apenas papel `entity` (escopo da própria entidade).
export const entitiesRoutes = Router();

entitiesRoutes.use(authGuard, roleGuard('entity'));

entitiesRoutes.get('/dashboard', getDashboard);
entitiesRoutes.get('/families', listFamilies);
entitiesRoutes.post('/families', createFamily);
entitiesRoutes.patch('/families/:id', updateFamily);
