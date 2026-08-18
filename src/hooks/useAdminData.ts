import { useState, useCallback, useEffect } from 'react';
import { storage } from '../backend/utils/storage';
import { adminApi } from '../api/adminApi';
import { familiesApi } from '../api/familiesApi';

// ──────────────────────────────────────────────────────────────────────────────
// Camada de dados do painel ADMIN — API-first com fallback localStorage (dev).
// Entidades/usuários/famílias vêm da API real quando o backend está no ar;
// mutações batem na API e atualizam o estado local. Sem backend → seeds locais.
// ──────────────────────────────────────────────────────────────────────────────

export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type AccountStatus = 'active' | 'suspended' | 'pending';
export type AdminRole = 'donor' | 'entity' | 'beneficiary' | 'admin';

export interface AdminEntity {
  id: string;
  name: string;
  cnpj: string;
  type: string;
  responsibleName: string;
  email: string;
  region: string;
  status: ModerationStatus;
  createdAt: string;
}

export interface AdminFamily {
  id: string;
  representativeName: string;
  neighborhood: string;
  city: string;
  childrenCount: number;
  entityName: string;
  status: ModerationStatus;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AccountStatus;
  totalDonated: number;
  createdAt: string;
}

const KEYS = {
  entities: 'admin_entities_v1',
  families: 'admin_families_v1',
  users: 'admin_users_v1',
};

const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86400000).toISOString();

// ── Seeds de demonstração (variados para exercitar os fluxos) ──────────────────
const SEED_ENTITIES: AdminEntity[] = [
  { id: 'e-esperanca', name: 'Instituto Esperança', cnpj: '00.000.000/0001-00', type: 'Instituto', responsibleName: 'Maria Silva', email: 'contato@institutoesperanca.org', region: 'Heliópolis', status: 'approved', createdAt: iso(40) },
  { id: 'e-helio', name: 'Coletivo Heliópolis Solidário', cnpj: '11.111.111/0001-11', type: 'Coletivo', responsibleName: 'João Ramos', email: 'ola@heliopolissolidario.org', region: 'Heliópolis', status: 'approved', createdAt: iso(30) },
  { id: 'e-paraiso', name: 'Rede Paraisópolis', cnpj: '22.222.222/0001-22', type: 'ONG', responsibleName: 'Ana Souza', email: 'rede@paraisopolis.org', region: 'Paraisópolis', status: 'pending', createdAt: iso(3) },
  { id: 'e-tiradentes', name: 'Casa Tiradentes', cnpj: '33.333.333/0001-33', type: 'Instituto', responsibleName: 'Carlos Lima', email: 'casa@tiradentes.org', region: 'Cidade Tiradentes', status: 'pending', createdAt: iso(1) },
  { id: 'e-brasil', name: 'Associação Brasilândia Viva', cnpj: '44.444.444/0001-44', type: 'Associação', responsibleName: 'Rita Nunes', email: 'viva@brasilandia.org', region: 'Brasilândia', status: 'rejected', createdAt: iso(12) },
];

const SEED_FAMILIES: AdminFamily[] = [
  { id: 'f1', representativeName: 'Maria Silva', neighborhood: 'Heliópolis', city: 'São Paulo', childrenCount: 2, entityName: 'Coletivo Heliópolis Solidário', status: 'approved', createdAt: iso(20) },
  { id: 'f2', representativeName: 'Dona Cida', neighborhood: 'Heliópolis', city: 'São Paulo', childrenCount: 3, entityName: 'Coletivo Heliópolis Solidário', status: 'pending', createdAt: iso(2) },
  { id: 'f3', representativeName: 'Roberto e Sônia', neighborhood: 'Cidade Tiradentes', city: 'São Paulo', childrenCount: 4, entityName: 'Casa Tiradentes', status: 'pending', createdAt: iso(1) },
  { id: 'f4', representativeName: 'Joana Prado', neighborhood: 'Paraisópolis', city: 'São Paulo', childrenCount: 1, entityName: 'Rede Paraisópolis', status: 'approved', createdAt: iso(15) },
  { id: 'f5', representativeName: 'Família Andrade', neighborhood: 'Brasilândia', city: 'São Paulo', childrenCount: 2, entityName: 'Associação Brasilândia Viva', status: 'suspended', createdAt: iso(25) },
];

const SEED_USERS: AdminUser[] = [
  { id: 'u-12345', name: 'Alexandre Doador', email: 'doador@mealfy.com', role: 'donor', status: 'active', totalDonated: 130, createdAt: iso(60) },
  { id: 'd-1', name: 'Marina R.', email: 'marina@mealfy.com', role: 'donor', status: 'active', totalDonated: 12500, createdAt: iso(120) },
  { id: 'd-2', name: 'Carlos S.', email: 'carlos@mealfy.com', role: 'donor', status: 'active', totalDonated: 9400, createdAt: iso(110) },
  { id: 'u-entity-1', name: 'Maria Silva', email: 'entidade@mealfy.com', role: 'entity', status: 'active', totalDonated: 0, createdAt: iso(40) },
  { id: 'u-beneficiary-1', name: 'João Beneficiário', email: 'beneficiario@mealfy.com', role: 'beneficiary', status: 'active', totalDonated: 0, createdAt: iso(35) },
  { id: 'u-spam', name: 'Conta Suspeita', email: 'spam@x.com', role: 'donor', status: 'suspended', totalDonated: 0, createdAt: iso(5) },
  { id: 'u-admin-1', name: 'Admin Mealfy', email: 'admin@mealfy.com', role: 'admin', status: 'active', totalDonated: 0, createdAt: iso(200) },
];

export function useAdminData() {
  const [entities, setEntities] = useState<AdminEntity[]>(
    () => storage.get<AdminEntity[]>(KEYS.entities, SEED_ENTITIES)
  );
  const [families, setFamilies] = useState<AdminFamily[]>(
    () => storage.get<AdminFamily[]>(KEYS.families, SEED_FAMILIES)
  );
  const [users, setUsers] = useState<AdminUser[]>(
    () => storage.get<AdminUser[]>(KEYS.users, SEED_USERS)
  );

  const persistEntities = useCallback((next: AdminEntity[]) => {
    setEntities(next); storage.set(KEYS.entities, next);
  }, []);
  const persistFamilies = useCallback((next: AdminFamily[]) => {
    setFamilies(next); storage.set(KEYS.families, next);
  }, []);
  const persistUsers = useCallback((next: AdminUser[]) => {
    setUsers(next); storage.set(KEYS.users, next);
  }, []);

  // ── API real: carrega entidades, usuários e famílias do backend ───────────
  // Status backend (UserStatus/FamilyApprovalStatus) → status do painel.
  const mapEntityStatus = (s: string): ModerationStatus =>
    s === 'active' ? 'approved' : s === 'blocked' ? 'suspended' : (s as ModerationStatus);
  const mapFamilyStatus = (s: string): ModerationStatus =>
    s === 'blocked' ? 'suspended' : (s as ModerationStatus);
  const mapUserStatus = (s: string): AccountStatus =>
    s === 'blocked' || s === 'suspended' ? 'suspended' : s === 'pending' ? 'pending' : 'active';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [entsRes, usersRes, famsRes] = await Promise.all([
          adminApi.listEntities(),
          adminApi.listUsers(),
          familiesApi.getManagedFamilies(),
        ]);
        if (cancelled) return;

        if (Array.isArray(entsRes?.entities)) {
          setEntities(entsRes.entities.map((e: any) => ({
            id: e.id, name: e.name, cnpj: e.cnpj, type: '—',
            responsibleName: e.responsibleName, email: e.email, region: '—',
            status: mapEntityStatus(e.status), createdAt: e.createdAt,
          })));
        }
        if (Array.isArray(usersRes?.users)) {
          setUsers(usersRes.users.map((u: any) => ({
            id: u.id, name: u.name, email: u.email, role: u.role,
            status: mapUserStatus(u.status), totalDonated: 0, createdAt: u.createdAt,
          })));
        }
        const famList = famsRes?.families ?? famsRes;
        if (Array.isArray(famList)) {
          setFamilies(famList.map((f: any) => ({
            id: f.id,
            representativeName: f.responsibleName ?? f.displayName ?? '—',
            neighborhood: f.neighborhood ?? '—',
            city: f.city ?? '—',
            childrenCount: f.childrenCount ?? (Array.isArray(f.dependents) ? f.dependents.length : 0),
            entityName: f.entityName ?? '—',
            status: mapFamilyStatus(f.approvalStatus ?? f.status),
            createdAt: f.createdAt,
          })));
        }
      } catch {
        // Backend fora do ar → mantém seeds locais (dev).
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Dispara mutação na API sem bloquear a UI (estado local já foi atualizado). */
  const fireAndForget = (fn: () => Promise<any>, label: string) => {
    fn().catch((e) => console.warn(`[ADMIN] ${label} falhou na API (estado local mantido):`, e?.message ?? e));
  };

  // ── Mutations ────────────────────────────────────────────────────────────
  const setEntityStatus = useCallback((id: string, status: ModerationStatus) => {
    persistEntities(entities.map(e => e.id === id ? { ...e, status } : e));
    // API real: approve/block existem; "rejected"/"pending" não têm rota (local-only).
    if (status === 'approved') fireAndForget(() => adminApi.approveEntity(id), 'approveEntity');
    if (status === 'suspended') fireAndForget(() => adminApi.blockEntity(id), 'blockEntity');
  }, [entities, persistEntities]);

  const setFamilyStatus = useCallback((id: string, status: ModerationStatus) => {
    persistFamilies(families.map(f => f.id === id ? { ...f, status } : f));
    // API real: approve/reject/block existem no backend.
    if (status === 'approved') fireAndForget(() => familiesApi.approveFamily(id), 'approveFamily');
    if (status === 'rejected') fireAndForget(() => familiesApi.rejectFamily(id), 'rejectFamily');
    if (status === 'suspended') fireAndForget(() => familiesApi.blockFamily(id), 'blockFamily');
  }, [families, persistFamilies]);

  const setUserStatus = useCallback((id: string, status: AccountStatus) => {
    persistUsers(users.map(u => u.id === id ? { ...u, status } : u));
    // API real: não há rota de status de usuário no backend (TODO) — local-only.
  }, [users, persistUsers]);

  const setUserRole = useCallback((id: string, role: AdminRole) => {
    persistUsers(users.map(u => u.id === id ? { ...u, role } : u));
    // API real: não há rota de troca de papel no backend (TODO) — local-only.
  }, [users, persistUsers]);

  // ── Métricas ────────────────────────────────────────────────────────────
  const stats = {
    usersByRole: {
      donors: users.filter(u => u.role === 'donor').length,
      entities: users.filter(u => u.role === 'entity').length,
      beneficiaries: users.filter(u => u.role === 'beneficiary').length,
      admins: users.filter(u => u.role === 'admin').length,
    },
    usersTotal: users.length,
    usersSuspended: users.filter(u => u.status === 'suspended').length,
    entitiesPending: entities.filter(e => e.status === 'pending').length,
    entitiesApproved: entities.filter(e => e.status === 'approved').length,
    familiesPending: families.filter(f => f.status === 'pending').length,
    familiesApproved: families.filter(f => f.status === 'approved').length,
    donationsTotal: users.reduce((s, u) => s + (u.totalDonated || 0), 0),
  };

  const resetSeed = useCallback(() => {
    persistEntities(SEED_ENTITIES);
    persistFamilies(SEED_FAMILIES);
    persistUsers(SEED_USERS);
  }, [persistEntities, persistFamilies, persistUsers]);

  return {
    entities, families, users, stats,
    setEntityStatus, setFamilyStatus, setUserStatus, setUserRole,
    resetSeed,
  };
}
