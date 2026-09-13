import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import { list, map, getOne, create, update, approve, reject, block, requestDailySupport } from './families.controller';
import { listFamilyDonations } from '../donations/donations.controller';

// Montado em /families. Tudo exige autenticação.
export const familiesRoutes = Router();

familiesRoutes.use(authGuard);

// Catálogo para doadores e gestão. Beneficiários acessam apenas /beneficiary/family.
familiesRoutes.get('/', roleGuard('donor', 'entity', 'admin'), list);
familiesRoutes.get('/map', roleGuard('donor', 'entity', 'admin'), map);
familiesRoutes.get('/:id', roleGuard('donor', 'entity', 'admin'), getOne);
familiesRoutes.get('/:id/donations', listFamilyDonations); // admin / entidade dona

familiesRoutes.post('/', roleGuard('entity', 'admin'), create);
familiesRoutes.patch('/:id', roleGuard('entity', 'admin'), update);

// Solicitação do dia — não libera vale nem cria doação.
// Inclui `beneficiary`: é a própria família quem sabe se precisa hoje, e a
// regra é que ela precisa pedir todo dia. O serviço confere o vínculo real.
familiesRoutes.post(
  '/:id/request-daily-support',
  roleGuard('beneficiary', 'entity', 'admin'),
  requestDailySupport,
);

// Aprovação/moderação — apenas admin
familiesRoutes.post('/:id/approve', roleGuard('admin'), approve);
familiesRoutes.post('/:id/reject', roleGuard('admin'), reject);
familiesRoutes.post('/:id/block', roleGuard('admin'), block);
