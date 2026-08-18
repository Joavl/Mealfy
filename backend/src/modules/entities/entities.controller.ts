import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import * as entitiesService from './entities.service';
import * as familiesService from '../families/families.service';
import { toManagedFamily } from '../families/families.dto';
import { createFamilySchema, updateFamilySchema } from '../families/families.validator';

function actorOf(req: Request) {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  return { userId: req.auth.userId, role: req.auth.role };
}

export async function getDashboard(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  return res.json(await entitiesService.getDashboard(actor.userId));
}

export async function listFamilies(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const families = await familiesService.listFamiliesForActor(actor, {});
  return res.json({ families: families.map(toManagedFamily) });
}

export async function createFamily(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const data = createFamilySchema.parse(req.body);
  const family = await familiesService.createFamily(actor, data);
  return res.status(201).json({ family: toManagedFamily(family) });
}

export async function updateFamily(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const data = updateFamilySchema.parse(req.body);
  const family = await familiesService.updateFamily(actor, req.params.id, data);
  return res.json({ family: toManagedFamily(family) });
}
