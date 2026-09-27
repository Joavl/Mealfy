import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import * as entitiesService from './entities.service';
import * as familiesService from '../families/families.service';
import { toManagedFamily } from '../families/families.dto';
import { createFamilySchema, updateFamilySchema } from '../families/families.validator';
import { dataSafetyPolicy } from '../../config/dataSafetyPolicy';

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
  // Reject protected payloads before validation reads or formats request fields.
  dataSafetyPolicy.assertFamilyDataCollectionAllowed();
  const actor = actorOf(req);
  const data = createFamilySchema.parse(req.body);
  const family = await familiesService.createFamily(actor, data);
  return res.status(201).json({ family: toManagedFamily(family) });
}

export async function updateFamily(req: Request, res: Response): Promise<Response> {
  // Same fail-closed ordering as create: schema errors must never disclose input.
  dataSafetyPolicy.assertFamilyDataCollectionAllowed();
  const actor = actorOf(req);
  const data = updateFamilySchema.parse(req.body);
  const family = await familiesService.updateFamily(actor, req.params.id, data);
  return res.json({ family: toManagedFamily(family) });
}

export async function acceptOperatorInvitation(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const { token } = entitiesService.acceptOperatorInvitationSchema.parse(req.body);
  const operator = await entitiesService.acceptInvitation(actor.userId, token);
  return res.json({ operator, message: 'Convite aceito. Entre novamente para continuar.' });
}

export async function listOperators(req: Request, res: Response): Promise<Response> {
  return res.json(await entitiesService.listOperators(actorOf(req).userId));
}

export async function inviteOperator(req: Request, res: Response): Promise<Response> {
  const result = await entitiesService.inviteOperator(actorOf(req).userId, entitiesService.inviteOperatorSchema.parse(req.body));
  return res.setHeader('Cache-Control', 'no-store').status(201).json(result);
}

export async function updateOperator(req: Request, res: Response): Promise<Response> {
  const operator = await entitiesService.updateOperator(
    actorOf(req).userId,
    req.params.membershipId,
    entitiesService.updateOperatorSchema.parse(req.body),
  );
  return res.json({ operator });
}
