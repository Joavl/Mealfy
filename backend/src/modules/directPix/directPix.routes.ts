import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import { acceptCurrentTerms, getCurrentTerms } from './terms.controller';
import { getReadiness } from './readiness.controller';
import { requireVerifiedEmail } from './verifiedEmailGuard';

export const directPixRoutes = Router();

directPixRoutes.use(authGuard, roleGuard('donor'));
directPixRoutes.get('/readiness', getReadiness);
directPixRoutes.get('/terms/current', requireVerifiedEmail, getCurrentTerms);
directPixRoutes.post('/terms/acceptances', requireVerifiedEmail, acceptCurrentTerms);
