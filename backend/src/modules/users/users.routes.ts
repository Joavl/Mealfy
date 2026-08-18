import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import { getMe, updateMe, updatePrivacy, deleteMe } from './users.controller';
import { listMyDonations } from '../donations/donations.controller';

// Montado em /me
export const usersRoutes = Router();

usersRoutes.get('/', authGuard, getMe);
usersRoutes.patch('/', authGuard, updateMe);
// DELETE /me — exclusão de conta (exigência Play Store / LGPD)
usersRoutes.delete('/', authGuard, deleteMe);
// GET /me/donations — histórico do doador (sem código)
usersRoutes.patch('/privacy', authGuard, updatePrivacy);
usersRoutes.get('/donations', authGuard, roleGuard('donor'), listMyDonations);
