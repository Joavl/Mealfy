import type { Request, Response } from 'express';
import { createStepUpChallengeSchema, confirmStepUpChallengeSchema, validateStepUpAuthorizationSchema } from './stepUp.validator';
import * as stepUpService from './stepUp.service';

export async function createStepUpChallenge(req: Request, res: Response): Promise<Response> {
  if (!req.auth) throw new Error('Authenticated route missing auth context');
  const result = await stepUpService.createStepUpChallenge(req.auth.userId, createStepUpChallengeSchema.parse(req.body));
  return res.status(202).json(result);
}
export async function validateStepUpAuthorization(req: Request, res: Response): Promise<Response> {
  if (!req.auth) throw new Error('Authenticated route missing auth context');
  const input = validateStepUpAuthorizationSchema.parse(req.body);
  await stepUpService.requireStepUpAuthorization({ userId: req.auth.userId, token: input.authorizationToken, purpose: input.purpose, resourceId: input.resourceId });
  res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
  return res.status(204).send();
}

export async function confirmStepUpChallenge(req: Request, res: Response): Promise<Response> {
  if (!req.auth) throw new Error('Authenticated route missing auth context');
  const result = await stepUpService.confirmStepUpChallenge(req.auth.userId, confirmStepUpChallengeSchema.parse(req.body));
  res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache' });
  return res.json(result);
}
