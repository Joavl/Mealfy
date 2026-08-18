import type { Request, Response } from 'express';

/** 404 padronizado para rotas inexistentes. */
export function notFoundHandler(req: Request, res: Response): Response {
  return res.status(404).json({ message: `Rota não encontrada: ${req.method} ${req.path}` });
}
