import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { assertDirectPixPrivacyActive, deactivateOwnDirectPix, exportOwnDirectPixData } from './privacy.service';

function owner(req: Request): string { if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated'); return req.auth.userId; }
function noStore(res: Response): Response { return res.set({ 'Cache-Control': 'no-store, private', Pragma: 'no-cache', Vary: 'Authorization' }); }

/** Applied to every authenticated Direct Pix operation except the owner's privacy endpoints. */
export async function directPixPrivacyGuard(req: Request, _res: Response, next: NextFunction): Promise<void> { await assertDirectPixPrivacyActive(owner(req)); next(); }
export async function exportOwnDirectPix(req: Request, res: Response): Promise<Response> { return noStore(res).json(await exportOwnDirectPixData(owner(req))); }
export async function deactivateOwnDirectPixController(req: Request, res: Response): Promise<Response> { return noStore(res).status(202).json(await deactivateOwnDirectPix(owner(req))); }
