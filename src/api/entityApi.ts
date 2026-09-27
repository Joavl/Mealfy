import { apiRequest } from './apiClient';

export type EntityOperatorPermission =
  | 'operators.manage'
  | 'families.read'
  | 'families.write'
  | 'pix.submit'
  | 'pix.review'
  | 'pix.follow_up'
  | 'audit.read';

export type EntityOperatorStatus = 'active' | 'suspended' | 'revoked';

export interface EntityOperatorSummary {
  id: string;
  user: { id: string; name: string; email: string; emailVerifiedAt: string | null };
  status: EntityOperatorStatus;
  permissions: EntityOperatorPermission[];
  createdAt: string;
  updatedAt: string;
}

export interface EntityOperatorsResponse {
  operators: EntityOperatorSummary[];
  availablePermissions: EntityOperatorPermission[];
  currentMembershipId: string;
  canManage: boolean;
}

export const entityApi = {
  acceptInvitation: (token: string) => apiRequest<{ operator: EntityOperatorSummary; message: string }>('/entity/operator-invitations/accept', 'POST', { token }),
  listOperators: () => apiRequest<EntityOperatorsResponse>('/entity/operators'),
  inviteOperator: (email: string, permissions: EntityOperatorPermission[]) =>
    apiRequest<{ invitation: { id: string; email: string; permissions: EntityOperatorPermission[]; expiresAt: string } }>(
      '/entity/operators/invitations', 'POST', { email, permissions },
    ),
  updateOperator: (membershipId: string, update: { permissions?: EntityOperatorPermission[]; status?: EntityOperatorStatus }) =>
    apiRequest<{ operator: EntityOperatorSummary }>(`/entity/operators/${membershipId}`, 'PATCH', update),
};

export const permissionLabels: Record<EntityOperatorPermission, string> = {
  'operators.manage': 'Gerenciar operadores',
  'families.read': 'Consultar famílias',
  'families.write': 'Gerenciar famílias',
  'pix.submit': 'Submeter chave',
  'pix.review': 'Revisar chave',
  'pix.follow_up': 'Acompanhar casos',
  'audit.read': 'Consultar auditoria',
};
