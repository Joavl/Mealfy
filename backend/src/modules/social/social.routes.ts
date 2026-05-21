import { Router, Request, Response } from 'express';
import { SocialService } from './social.service';

const socialRoutes = Router();

/** Redireciona para a página oficial Mealfy no Facebook */
socialRoutes.get('/facebook', (_req: Request, res: Response) => {
  const url = SocialService.getMealfyFacebookRedirect();
  return res.redirect(302, url);
});

/** Redireciona para o Facebook do doador (ou página Mealfy se não tiver) */
socialRoutes.get('/facebook/donor/:userId', async (req: Request, res: Response) => {
  const result = await SocialService.resolveDonorFacebook(req.params.userId as string);
  return res.redirect(302, result.url);
});

/** JSON com URL do Facebook (para o app abrir via Linking / window.open) */
socialRoutes.get('/resolve/facebook/:userId', async (req: Request, res: Response) => {
  const result = await SocialService.resolveDonorFacebook(req.params.userId as string);
  return res.json(result);
});

socialRoutes.get('/resolve/facebook', (_req: Request, res: Response) => {
  return res.json({
    platform: 'facebook',
    url: SocialService.getMealfyFacebookRedirect(),
    source: 'mealfy_default',
  });
});

export { socialRoutes };
