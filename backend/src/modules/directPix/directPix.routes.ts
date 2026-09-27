import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import { acceptCurrentTerms, getCurrentTerms } from './terms.controller';

export const directPixRoutes = Router();

directPixRoutes.use(authGuard, roleGuard('donor'));
directPixRoutes.get('/terms/current', getCurrentTerms);
directPixRoutes.post('/terms/acceptances', acceptCurrentTerms);
