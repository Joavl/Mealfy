import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { getTopDonors, getMyRanking } from './ranking.controller';

// Montado em /ranking
export const rankingRoutes = Router();

// Público — carrossel de stories visível sem login
rankingRoutes.get('/', getTopDonors);
// Autenticado — posição do doador logado
rankingRoutes.get('/me', authGuard, getMyRanking);
