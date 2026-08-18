import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import * as regionsService from './regions.service';
import * as communitiesService from './communities.service';

// Montado em /regions.
export const regionsRoutes = Router();

const searchSchema = z.object({
  q: z.string().min(2, 'Informe ao menos 2 letras'),
  state: z.string().length(2).optional(),
});

/**
 * Regiões onde a rede atua, com contagem de famílias — alimenta o seletor de
 * região do doador. Antes essa lista vinha de 4 comunidades fixas no código do
 * app, que não conversavam com os dados reais.
 */
regionsRoutes.get('/', authGuard, async (_req: Request, res: Response) => {
  return res.json({ regions: await regionsService.listRegionsWithCounts() });
});

/**
 * Busca de município para o cadastro. Autenticada — quem cadastra família é
 * entidade/admin, e não há motivo para expor a base inteira publicamente.
 */
regionsRoutes.get('/search', authGuard, async (req: Request, res: Response) => {
  const { q, state } = searchSchema.parse(req.query);
  return res.json({ regions: await regionsService.searchRegions(q, state) });
});

/**
 * Regiões com famílias aprovadas + contagem — é o que o mapa desenha.
 * Autenticada porque o mapa já vive atrás de login.
 */
regionsRoutes.get('/map', authGuard, async (_req: Request, res: Response) => {
  return res.json({ regions: await regionsService.listRegionsWithFamilies() });
});

/**
 * Comunidades com famílias — "Cidade de Deus", "Heliópolis". É o que o mapa
 * desenha para o doador saber a quem está doando: o município sozinho não diz.
 */
regionsRoutes.get('/communities/map', authGuard, async (_req: Request, res: Response) => {
  return res.json({ communities: await communitiesService.listCommunitiesForMap() });
});

/**
 * Vincula famílias antigas às comunidades. Admin: é migração de dados, roda uma
 * vez depois do deploy que criou a tabela.
 */
regionsRoutes.post(
  '/communities/backfill',
  authGuard,
  roleGuard('admin'),
  async (_req: Request, res: Response) => {
    return res.json(await communitiesService.backfillCommunities());
  },
);

/**
 * Importa a lista do IBGE. Admin: é operação de manutenção, não de uso normal,
 * e depende de rede externa.
 */
regionsRoutes.post(
  '/import-ibge',
  authGuard,
  roleGuard('admin'),
  async (_req: Request, res: Response) => {
    return res.json(await regionsService.importFromIbge());
  },
);
