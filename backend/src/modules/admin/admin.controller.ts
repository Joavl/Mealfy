import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { listAuditLogs } from '../auditLogs/auditLog.service';
import * as adminService from './admin.service';

function adminId(req: Request): string {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  return req.auth.userId;
}

export async function getAuditLogs(req: Request, res: Response): Promise<Response> {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const logs = await listAuditLogs(limit);
  return res.json({ logs });
}

export async function listEntities(_req: Request, res: Response): Promise<Response> {
  const entities = await adminService.listEntities();
  return res.json({ entities });
}

export async function listUsers(_req: Request, res: Response): Promise<Response> {
  const users = await adminService.listUsers();
  return res.json({ users });
}

export async function approveEntity(req: Request, res: Response): Promise<Response> {
  const entity = await adminService.setEntityStatus(adminId(req), req.params.id, 'active', 'approve_entity');
  return res.json({ entity });
}

export async function blockEntity(req: Request, res: Response): Promise<Response> {
  const entity = await adminService.setEntityStatus(adminId(req), req.params.id, 'blocked', 'block_entity');
  return res.json({ entity });
}
