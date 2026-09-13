import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Star, Building2, Users2, UserCog, LogOut, ArrowLeft,
  ChevronUp, ChevronDown, Trash2, Plus, Check, X, ShieldCheck, Save, RotateCcw,
  Gift, Upload, RefreshCw,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useAdminData } from '../hooks/useAdminData';
import type { ModerationStatus } from '../hooks/useAdminData';
import type { PublicDonorProfile } from '../backend/types';
import { adminService } from '../backend/services/adminService';
import type { ImportGiftCardsPayload } from '../api/adminApi';
import StoriesRanking from '../components/ui/StoriesRanking';
import './AdminDashboard.css';

type Section = 'overview' | 'stories' | 'entities' | 'families' | 'users' | 'giftcards';

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Visão geral', icon: <LayoutDashboard size={18} /> },
  { id: 'stories',  label: 'Stories (Top 20)', icon: <Star size={18} /> },
  { id: 'entities', label: 'Entidades', icon: <Building2 size={18} /> },
  { id: 'families', label: 'Famílias', icon: <Users2 size={18} /> },
  { id: 'users',    label: 'Usuários', icon: <UserCog size={18} /> },
  { id: 'giftcards', label: 'Gift Cards', icon: <Gift size={18} /> },
];

const statusLabel: Record<ModerationStatus, string> = {
  pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', suspended: 'Suspenso',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`admin-badge admin-badge--${status}`}>{statusLabel[status as ModerationStatus] || status}</span>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, logout, stories, refreshStories } = useAppContext();
  const admin = useAdminData();

  const [section, setSection] = useState<Section>('overview');

  // ── Stories draft (ordem persistida no backend) ─────────────────────────
  const [draft, setDraft] = useState<PublicDonorProfile[]>([]);
  const [savedStoryIds, setSavedStoryIds] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<PublicDonorProfile[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesSaving, setStoriesSaving] = useState(false);
  const dirty = useMemo(() => JSON.stringify(draft.map((story) => story.id)) !== JSON.stringify(savedStoryIds), [draft, savedStoryIds]);

  const loadStories = async () => {
    setStoriesLoading(true);
    try {
      const response = await adminService.getRankingStories();
      const configuredStories = response?.stories ?? [];
      setDraft(configuredStories);
      setSavedStoryIds(configuredStories.map((story: PublicDonorProfile) => story.id));
      setCandidates(response?.candidates ?? []);
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível carregar os stories.', 'error');
    } finally {
      setStoriesLoading(false);
    }
  };

  useEffect(() => { if (section === 'stories') void loadStories(); }, [section]);
  const move = (index: number, direction: -1 | 1) => setDraft((current) => {
    const next = index + direction;
    if (next < 0 || next >= current.length) return current;
    const reordered = [...current];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    return reordered;
  });
  const removeStory = (index: number) => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const addStory = (donor: PublicDonorProfile) => setDraft((current) => current.some((story) => story.id === donor.id) || current.length >= 20 ? current : [...current, donor]);
  const saveStories = async () => {
    setStoriesSaving(true);
    try {
      await adminService.saveRankingStories(draft.map((story) => story.id));
      await Promise.all([loadStories(), refreshStories()]);
      showToast('Stories salvos e ranking público atualizado.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível salvar os stories.', 'error');
    } finally {
      setStoriesSaving(false);
    }
  };


  // ── Moderação com feedback ──────────────────────────────────────────────
  const moderateEntity = (id: string, status: ModerationStatus, name: string) => {
    admin.setEntityStatus(id, status);
    showToast(`Entidade "${name}" → ${statusLabel[status]}.`, status === 'rejected' || status === 'suspended' ? 'info' : 'success');
  };
  const moderateFamily = (id: string, status: ModerationStatus, name: string) => {
    admin.setFamilyStatus(id, status);
    showToast(`Família "${name}" → ${statusLabel[status]}.`, status === 'rejected' || status === 'suspended' ? 'info' : 'success');
  };

  const handleLogout = async () => { await logout(); navigate('/auth'); };

  // ── Gift Cards — operação manual de estoque (API real; fulfillment manual) ──
  const PROVIDERS = [
    { id: 'ifood', label: 'iFood' },
    { id: 'ninetynine', label: '99 Mercado' },
    { id: 'carrefour', label: 'Carrefour' },
  ] as const;

  const [gcStock, setGcStock] = useState<any>(null);
  const [gcLoading, setGcLoading] = useState(false);
  const [gcImporting, setGcImporting] = useState(false);
  const [gcResult, setGcResult] = useState<any>(null);
  const [gcForm, setGcForm] = useState({
    provider: 'ifood' as ImportGiftCardsPayload['provider'],
    batchName: '',
    amountReais: '25',
    expiresAt: '',
    codesText: '',
  });

  const loadStock = async () => {
    setGcLoading(true);
    try {
      const resp = await adminService.getGiftCardStock();
      setGcStock(resp?.stock ?? resp ?? null);
    } catch {
      showToast('Não foi possível carregar o estoque.', 'error');
    } finally {
      setGcLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'giftcards' && gcStock === null && !gcLoading) loadStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const stockOf = (provider: string): any => {
    if (!gcStock) return null;
    if (Array.isArray(gcStock)) return gcStock.find((s: any) => s.provider === provider);
    return gcStock[provider] ?? null;
  };

  const handleImport = async () => {
    const codes = gcForm.codesText.split('\n').map((c) => c.trim()).filter(Boolean);
    const amount = Math.round(Number(gcForm.amountReais.replace(',', '.')) * 100);
    if (!gcForm.batchName.trim()) { showToast('Informe o nome do lote.', 'error'); return; }
    if (!amount || amount <= 0) { showToast('Valor inválido.', 'error'); return; }
    if (codes.length === 0) { showToast('Cole ao menos um código.', 'error'); return; }

    setGcImporting(true);
    setGcResult(null);
    try {
      const summary = await adminService.importGiftCards({
        provider: gcForm.provider,
        batchName: gcForm.batchName.trim(),
        amount,
        expiresAt: gcForm.expiresAt ? new Date(gcForm.expiresAt).toISOString() : undefined,
        codes,
      });
      setGcResult(summary);
      showToast('Lote importado com sucesso!', 'success');
      setGcForm((f) => ({ ...f, batchName: '', codesText: '' }));
      loadStock();
    } catch (e: any) {
      showToast(e?.message || 'Falha ao importar lote. O backend está no ar?', 'error');
    } finally {
      setGcImporting(false);
    }
  };

  return (
    <div className="admin-page">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <ShieldCheck size={20} /> <span>Mealfy <strong>Admin</strong></span>
        </div>
        <nav className="admin-nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`admin-nav-item ${section === n.id ? 'active' : ''}`}
              onClick={() => setSection(n.id)}
            >
              {n.icon}<span>{n.label}</span>
              {n.id === 'entities' && admin.stats.entitiesPending > 0 && <em className="admin-nav-badge">{admin.stats.entitiesPending}</em>}
              {n.id === 'families' && admin.stats.familiesPending > 0 && <em className="admin-nav-badge">{admin.stats.familiesPending}</em>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-whoami">
            <span className="admin-whoami-name">{user?.name || 'Admin'}</span>
            <span className="admin-whoami-role">Administrador</span>
          </div>
          <button className="admin-foot-btn" onClick={() => navigate('/')}><ArrowLeft size={16} /> Ir ao app</button>
          <button className="admin-foot-btn admin-foot-btn--danger" onClick={handleLogout}><LogOut size={16} /> Sair</button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="admin-main">
        <header className="admin-topbar">
          <h1>{NAV.find((n) => n.id === section)?.label}</h1>
          {section === 'stories' && (
            <div className="admin-topbar-actions">
              <button className="admin-btn admin-btn--ghost" onClick={loadStories} disabled={!dirty || storiesSaving}><RotateCcw size={16} /> Descartar</button>
              <button className="admin-btn admin-btn--primary" onClick={saveStories} disabled={!dirty || storiesSaving}>{storiesSaving ? 'Salvando…' : <><Save size={16} /> Salvar alterações</>}</button>
            </div>
          )}
        </header>

        <div className="admin-content">
          {/* ===== OVERVIEW ===== */}
          {section === 'overview' && (
            <>
              <div className="admin-stats-grid">
                <StatCard label="Usuários" value={admin.stats.usersTotal} />
                <StatCard label="Doadores" value={admin.stats.usersByRole.donors} />
                <StatCard label="Entidades" value={admin.stats.usersByRole.entities} />
                <StatCard label="Beneficiários" value={admin.stats.usersByRole.beneficiaries} />
                <StatCard label="Entidades pendentes" value={admin.stats.entitiesPending} tone="warning" />
                <StatCard label="Famílias pendentes" value={admin.stats.familiesPending} tone="warning" />
                <StatCard label="Contas suspensas" value={admin.stats.usersSuspended} tone="error" />
                <StatCard label="Total doado" value={`R$ ${admin.stats.donationsTotal.toLocaleString('pt-BR')}`} tone="success" />
                <StatCard label="Stories ativos" value={stories.length} />
              </div>
              <div className="mt-6">
                <p className="text-xs text-outline mb-2 font-semibold uppercase tracking-wide">Prévia do carrossel</p>
                <StoriesRanking
                  donors={stories}
                  currentUser={null}
                  onSelectDonor={(donor: any) => { if (!donor.isSorteio) navigate(`/profile/${donor.id}`); }}
                />
              </div>
            </>
          )}

          {/* ===== STORIES ===== */}
          {section === 'stories' && (
            <div className="admin-stories">
              <p className="admin-hint">Selecione e reordene até 20 usuários do tipo doador. Eles aparecem primeiro; depois, o app exibe os demais doadores pelo ranking automático.</p>
              {storiesLoading ? <p className="admin-muted">Carregando stories…</p> : draft.map((story, index) => (
                <div className="admin-story-card" key={story.id}>
                  <div className="admin-story-rank">
                    <button className="admin-icon-btn" onClick={() => move(index, -1)} disabled={index === 0 || storiesSaving} aria-label="Subir"><ChevronUp size={16} /></button>
                    <span className="admin-story-pos">{index + 1}</span>
                    <button className="admin-icon-btn" onClick={() => move(index, 1)} disabled={index === draft.length - 1 || storiesSaving} aria-label="Descer"><ChevronDown size={16} /></button>
                  </div>
                  <div className="admin-story-avatar" aria-hidden="true">
                    {story.avatar?.startsWith('http') ? <img src={story.avatar} alt="" /> : <span>{(story.name || '?').slice(0, 1).toUpperCase()}</span>}
                  </div>
                  <div className="admin-story-fields">
                    <strong>{story.name}</strong>
                    <span className="admin-muted">{story.supportsCount} apoios · R$ {(story.totalDonated / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <div className="admin-story-toggles"><button className="admin-toggle admin-toggle--danger" onClick={() => removeStory(index)} disabled={storiesSaving}><Trash2 size={14} /> Remover</button></div>
                  </div>
                </div>
              ))}
              {!storiesLoading && draft.length === 0 && <p className="admin-muted">Nenhum doador selecionado.</p>}
              <div className="admin-story-fields" style={{ marginTop: 16 }}>
                <strong>Doadores elegíveis</strong>
                <div className="admin-story-toggles">
                  {candidates.filter((candidate) => !draft.some((story) => story.id === candidate.id)).map((candidate) => (
                    <button key={candidate.id} className="admin-toggle" onClick={() => addStory(candidate)} disabled={draft.length >= 20 || storiesSaving}><Plus size={14} /> {candidate.name}</button>
                  ))}
                </div>
              </div>
            </div>
          )}


          {/* ===== ENTITIES ===== */}
          {section === 'entities' && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Entidade</th><th>Região</th><th>Responsável</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {admin.entities.map((e) => (
                    <tr key={e.id}>
                      <td><strong>{e.name}</strong><br /><span className="admin-muted">{e.cnpj}</span></td>
                      <td>{e.region}</td>
                      <td>{e.responsibleName}<br /><span className="admin-muted">{e.email}</span></td>
                      <td><StatusBadge status={e.status} /></td>
                      <td className="admin-actions">
                        {e.status !== 'approved' && <button className="admin-act admin-act--ok" onClick={() => moderateEntity(e.id, 'approved', e.name)}><Check size={14} /> Aprovar</button>}
                        {e.status !== 'rejected' && <button className="admin-act admin-act--no" onClick={() => moderateEntity(e.id, 'rejected', e.name)}><X size={14} /> Rejeitar</button>}
                        {e.status === 'approved' && <button className="admin-act" onClick={() => moderateEntity(e.id, 'suspended', e.name)}>Suspender</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== FAMILIES ===== */}
          {section === 'families' && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Representante</th><th>Bairro</th><th>Crianças</th><th>Entidade</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {admin.families.map((f) => (
                    <tr key={f.id}>
                      <td><strong>{f.representativeName}</strong></td>
                      <td>{f.neighborhood}</td>
                      <td>{f.childrenCount}</td>
                      <td>{f.entityName}</td>
                      <td><StatusBadge status={f.status} /></td>
                      <td className="admin-actions">
                        {f.status !== 'approved' && <button className="admin-act admin-act--ok" onClick={() => moderateFamily(f.id, 'approved', f.representativeName)}><Check size={14} /> Aprovar</button>}
                        {f.status !== 'rejected' && <button className="admin-act admin-act--no" onClick={() => moderateFamily(f.id, 'rejected', f.representativeName)}><X size={14} /> Rejeitar</button>}
                        {f.status === 'approved' && <button className="admin-act" onClick={() => moderateFamily(f.id, 'suspended', f.representativeName)}>Suspender</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== USERS ===== */}
          {section === 'users' && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {admin.users.map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.name}</strong></td>
                      <td className="admin-muted">{u.email}</td>
                      <td>
                        <select
                          className="admin-select"
                          value={u.role}
                          onChange={(e) => { admin.setUserRole(u.id, e.target.value as any); showToast(`Papel de ${u.name} alterado para ${e.target.value}.`, 'success'); }}
                        >
                          <option value="donor">Doador</option>
                          <option value="entity">Entidade</option>
                          <option value="beneficiary">Beneficiário</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td><span className={`admin-badge admin-badge--${u.status === 'active' ? 'approved' : u.status}`}>{u.status === 'active' ? 'Ativo' : u.status === 'suspended' ? 'Suspenso' : 'Pendente'}</span></td>
                      <td className="admin-actions">
                        {u.status === 'active'
                          ? <button className="admin-act admin-act--no" onClick={() => { admin.setUserStatus(u.id, 'suspended'); showToast(`${u.name} suspenso.`, 'info'); }}>Suspender</button>
                          : <button className="admin-act admin-act--ok" onClick={() => { admin.setUserStatus(u.id, 'active'); showToast(`${u.name} reativado.`, 'success'); }}><Check size={14} /> Ativar</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* ===== GIFT CARDS — operação manual de estoque ===== */}
          {section === 'giftcards' && (
            <div className="admin-giftcards">
              <div className="flex items-center justify-between mb-4">
                <p className="admin-hint" style={{ margin: 0 }}>
                  Estoque real de vales (API). A importação criptografa os códigos no backend (AES-256-GCM) — eles nunca ficam salvos em claro.
                </p>
                <button className="admin-btn admin-btn--ghost" onClick={loadStock} disabled={gcLoading}>
                  <RefreshCw size={16} /> {gcLoading ? 'Atualizando…' : 'Atualizar'}
                </button>
              </div>

              {/* Estoque por provider */}
              <div className="admin-stats-grid mb-6">
                {PROVIDERS.map((p) => {
                  const s = stockOf(p.id);
                  return (
                    <StatCard
                      key={p.id}
                      label={`${p.label} — disponíveis`}
                      value={s ? (s.available ?? 0) : (gcLoading ? '…' : '—')}
                      tone={s && (s.available ?? 0) === 0 ? 'error' : 'success'}
                    />
                  );
                })}
              </div>

              {/* Formulário de importação de lote */}
              <div className="admin-story-card">
                <div className="admin-story-fields" style={{ width: '100%' }}>
                  <h3 className="font-bold text-primary text-sm mb-2 flex items-center gap-2">
                    <Upload size={16} /> Importar lote de códigos
                  </h3>
                  <div className="admin-field-row">
                    <label>Parceiro
                      <select
                        className="admin-select"
                        value={gcForm.provider}
                        onChange={(e) => setGcForm((f) => ({ ...f, provider: e.target.value as any }))}
                      >
                        {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </label>
                    <label>Nome do lote
                      <input
                        value={gcForm.batchName}
                        placeholder="Ex.: Lote Agosto/2026"
                        onChange={(e) => setGcForm((f) => ({ ...f, batchName: e.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="admin-field-row">
                    <label>Valor por vale (R$)
                      <input
                        type="number"
                        min="1"
                        value={gcForm.amountReais}
                        onChange={(e) => setGcForm((f) => ({ ...f, amountReais: e.target.value }))}
                      />
                    </label>
                    <label>Validade (opcional)
                      <input
                        type="date"
                        value={gcForm.expiresAt}
                        onChange={(e) => setGcForm((f) => ({ ...f, expiresAt: e.target.value }))}
                      />
                    </label>
                  </div>
                  <label className="admin-field-full">Códigos (1 por linha)
                    <textarea
                      rows={6}
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, border: '1px solid var(--color-outline-variant, #ddd)', borderRadius: 4 }}
                      placeholder={'IFOOD-AAAA-0001\nIFOOD-BBBB-0002'}
                      value={gcForm.codesText}
                      onChange={(e) => setGcForm((f) => ({ ...f, codesText: e.target.value }))}
                    />
                  </label>
                  <div className="admin-story-toggles">
                    <button className="admin-btn admin-btn--primary" onClick={handleImport} disabled={gcImporting}>
                      <Upload size={16} /> {gcImporting ? 'Importando…' : 'Importar lote'}
                    </button>
                  </div>

                  {/* Resumo da importação (nunca mostra códigos) */}
                  {gcResult && (
                    <div className="admin-table-wrap mt-4">
                      <table className="admin-table">
                        <tbody>
                          <tr><td><strong>Lote</strong></td><td className="admin-muted">{gcResult.batchId}</td></tr>
                          <tr><td><strong>Recebidos</strong></td><td>{gcResult.totalReceived}</td></tr>
                          <tr><td><strong>Importados</strong></td><td className="text-success font-bold">{gcResult.totalImported}</td></tr>
                          <tr><td><strong>Duplicados</strong></td><td>{gcResult.totalDuplicated}</td></tr>
                          <tr><td><strong>Inválidos</strong></td><td>{gcResult.totalInvalid}</td></tr>
                          {Array.isArray(gcResult.warnings) && gcResult.warnings.length > 0 && (
                            <tr><td><strong>Avisos</strong></td><td className="admin-muted">{gcResult.warnings.join(' · ')}</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: React.ReactNode; tone?: 'warning' | 'error' | 'success' }> = ({ label, value, tone }) => (
  <div className={`admin-stat ${tone ? `admin-stat--${tone}` : ''}`}>
    <span className="admin-stat-value">{value}</span>
    <span className="admin-stat-label">{label}</span>
  </div>
);

export default AdminDashboard;
