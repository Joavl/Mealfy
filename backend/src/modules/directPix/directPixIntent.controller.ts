import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { idempotencyKeySchema, correlationIdSchema } from './terms.validator';
import { createIntentSchema, declarationSchema } from './directPixIntent.validator';
import * as service from './directPixIntent.service';
function user(req: Request) { if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated'); return req.auth.userId; }
function idempotency(req: Request) { const x=idempotencyKeySchema.safeParse(req.header('Idempotency-Key')); if(!x.success) throw new AppError('Idempotency-Key inválida.',422,'invalid_idempotency_key'); return x.data; }
function correlation(req: Request) { const value=req.header('X-Correlation-Id'); if(!value)return randomUUID();const x=correlationIdSchema.safeParse(value);if(!x.success)throw new AppError('X-Correlation-Id inválido.',422,'invalid_correlation_id');return x.data; }
export async function createIntent(req:Request,res:Response) { const result=await service.createIntent(user(req),{...createIntentSchema.parse(req.body),idempotencyKey:idempotency(req),correlationId:correlation(req)});if(result.replayed)res.setHeader('Idempotency-Replayed','true');return res.status(201).json(result); }
export async function grantDisclosure(req:Request,res:Response) { const result=await service.createDisclosureGrant(user(req),req.params.id);res.setHeader('Cache-Control','no-store');res.setHeader('Pragma','no-cache');return res.status(201).json(result); }
export async function disclose(req:Request,res:Response) { const token=req.header('X-Disclosure-Token');if(!token)throw new AppError('X-Disclosure-Token é obrigatório.',422,'disclosure_token_required');const result=await service.disclose(user(req),req.params.id,token);res.setHeader('Cache-Control','no-store');res.setHeader('Pragma','no-cache');return res.json(result); }
export async function declare(req:Request,res:Response) { declarationSchema.parse(req.body);const result=await service.declareSend(user(req),req.params.id,{idempotencyKey:idempotency(req),correlationId:correlation(req)});if(result.replayed)res.setHeader('Idempotency-Replayed','true');return res.status(201).json({declaration:{id:result.declarationId,status:'IN_PROGRESS'}}); }
export async function familyPublicProjection(req:Request,res:Response) { return res.json(await service.publicProjection(req.params.familyId)); }
