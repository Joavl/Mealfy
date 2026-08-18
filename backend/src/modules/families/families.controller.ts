import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import * as familiesService from './families.service';
import { toDonorFamily, toManagedFamily, type FamilyWithDependents } from './families.dto';
import {
  createFamilySchema,
  updateFamilySchema,
  rejectSchema,
  listFamiliesQuerySchema,
  requestDailySupportSchema,
} from './families.validator';

function actorOf(req: Request) {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  return { userId: req.auth.userId, role: req.auth.role };
}

const manages = (role: string) => role === 'admin' || role === 'entity';
const serialize = (role: string, f: FamilyWithDependents) =>
  manages(role) ? toManagedFamily(f) : toDonorFamily(f);

export async function list(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const filters = listFamiliesQuerySchema.parse(req.query);
  const families = await familiesService.listFamiliesForActor(actor, filters);
  return res.json({ families: families.map((f) => serialize(actor.role, f)) });
}

export async function map(req: Request, res: Response): Promise<Response> {
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const families = await familiesService.getMapFamilies({ state });
  return res.json({ families: families.map(toDonorFamily) });
}

export async function getOne(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const { family, view } = await familiesService.getFamilyForActor(actor, req.params.id);
  return res.json({ family: view === 'managed' ? toManagedFamily(family) : toDonorFamily(family) });
}

export async function create(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const data = createFamilySchema.parse(req.body);
  const family = await familiesService.createFamily(actor, data);
  return res.status(201).json({ family: toManagedFamily(family) });
}

export async function update(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const data = updateFamilySchema.parse(req.body);
  const family = await familiesService.updateFamily(actor, req.params.id, data);
  return res.json({ family: toManagedFamily(family) });
}

export async function approve(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const family = await familiesService.approveFamily(actor, req.params.id);
  return res.json({ family: toManagedFamily(family) });
}

export async function reject(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const { reason } = rejectSchema.parse(req.body ?? {});
  const family = await familiesService.rejectFamily(actor, req.params.id, reason);
  return res.json({ family: toManagedFamily(family) });
}

export async function block(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const { reason } = rejectSchema.parse(req.body ?? {});
  const family = await familiesService.blockFamily(actor, req.params.id, reason);
  return res.json({ family: toManagedFamily(family) });
}

export async function requestDailySupport(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const { provider } = requestDailySupportSchema.parse(req.body);
  const family = await familiesService.requestDailySupport(actor, req.params.id, provider);
  return res.json({ family: toManagedFamily(family) });
}
