import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import {
  getDashboard, listFamilies, createFamily, updateFamily, listOperators, inviteOperator, updateOperator, acceptOperatorInvitation,
} from './entities.controller';

// Montado em /entity — apenas papel `entity` (escopo da própria entidade).
export const entitiesRoutes = Router();

entitiesRoutes.post('/operator-invitations/accept', authGuard, acceptOperatorInvitation);
entitiesRoutes.use(authGuard, roleGuard('entity'));

entitiesRoutes.get('/dashboard', getDashboard);
entitiesRoutes.get('/families', listFamilies);
entitiesRoutes.post('/families', createFamily);
entitiesRoutes.patch('/families/:id', updateFamily);
entitiesRoutes.get('/operators', listOperators);
entitiesRoutes.post('/operators/invitations', inviteOperator);
entitiesRoutes.patch('/operators/:membershipId', updateOperator);
