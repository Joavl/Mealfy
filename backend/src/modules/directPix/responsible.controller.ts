import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { toFamilyResponsibleAssignmentDto } from './responsible.dto';
import { acceptFamilyResponsibleInvitationSchema, endFamilyResponsibleAssignmentSchema, idempotencyKeySchema, inviteFamilyResponsibleSchema } from './responsible.validator';
import * as responsibleService from './responsible.service';

function idempotencyKeyOf(req: Request): string {
  const raw = req.header('Idempotency-Key');
  if (!raw) throw new AppError('Idempotency-Key é obrigatória.', 422, 'idempotency_key_required');
  const parsed = idempotencyKeySchema.safeParse(raw);
  if (!parsed.success) throw new AppError('Idempotency-Key inválida.', 422, 'invalid_idempotency_key');
  return parsed.data;
}

function actorOf(req: Request) {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  return req.auth;
}

export async function inviteFamilyResponsible(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const result = await responsibleService.inviteFamilyResponsible(actor.userId, actor.role, req.params.familyId, inviteFamilyResponsibleSchema.parse(req.body), idempotencyKeyOf(req));
  return res.setHeader('Cache-Control', 'no-store').status(201).json(result);
}

export async function acceptFamilyResponsibleInvitation(req: Request, res: Response): Promise<Response> {
  const result = await responsibleService.acceptFamilyResponsibleInvitation(actorOf(req).userId, acceptFamilyResponsibleInvitationSchema.parse(req.body).token, idempotencyKeyOf(req));
  if (result.replayed) res.setHeader('Idempotency-Replayed', 'true');
  return res.setHeader('Cache-Control', 'no-store').status(201).json({ assignment: toFamilyResponsibleAssignmentDto(result.assignment) });
}

export async function endFamilyResponsibleAssignment(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const result = await responsibleService.endFamilyResponsibleAssignment(actor.userId, actor.role, req.params.familyId, req.params.assignmentId, endFamilyResponsibleAssignmentSchema.parse(req.body).endReason, idempotencyKeyOf(req));
  if (result.replayed) res.setHeader('Idempotency-Replayed', 'true');
  return res.json({ assignment: toFamilyResponsibleAssignmentDto(result.assignment) });
}

export async function getOwnFamilyResponsibleState(req: Request, res: Response): Promise<Response> {
  const { assignment } = await responsibleService.getOwnFamilyResponsibleState(actorOf(req).userId);
  return res.setHeader('Cache-Control', 'no-store').json({ assignment: assignment ? toFamilyResponsibleAssignmentDto(assignment) : null });
}
