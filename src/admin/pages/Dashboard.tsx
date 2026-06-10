import React, { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import KpiCard from '../components/KpiCard';
import StatusBadge from '../components/StatusBadge';
import {
  Users,
  Building2,
  Heart,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  previewOverview,
  previewIndications,
  previewEntities,
  previewAuditLogs,
  type OverviewData,
  type PreviewIndication,
  type PreviewEntity,
  type PreviewAuditLog,
} from '../dev/adminPreviewData';
import { adminApi } from '../services/adminApi';

const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<OverviewData>(previewOverview);
  const [indications, setIndications] = useState<PreviewIndication[]>(previewIndications);
  const [entities, setEntities] = useState<PreviewEntity[]>(previewEntities);
  const [logs, setLogs] = useState<PreviewAuditLog[]>(previewAuditLogs);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isPreview = import.meta.env.VITE_ADMIN_PREVIEW === 'true';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        if (isPreview) {
          // Utiliza dados locais do preview previewOverview
          await new Promise((resolve) => setTimeout(resolve, 600));
          setOverview(previewOverview);
          setIndications(previewIndications.slice(0, 3));
          setEntities(previewEntities.filter((e) => e.status === 'pending'));
          setLogs(previewAuditLogs);
        } else {
          // Busca real da API
          const realOverview = await adminApi.getOverview();
          setOverview(realOverview);
          // Se houver serviços implementados mais tarde, preencheremos aqui
        }
      } catch (err) {
        console.error('Falha ao obter dados do dashboard:', err);
        setError('Não foi possível carregar os dados reais do painel administrativo.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isPreview]);

  if (loading) {
    return (
      <AdminLayout title="Painel de Controle">
        <div className="admin-loading-state">
          <div className="admin-spinner" />
          <span>Carregando dados consolidados...</span>
        </div>
      </AdminLayout>
    );
  }

  if (error && !isPreview) {
    return (
      <AdminLayout title="Painel de Controle">
        <div className="admin-error-state">
          <p>{error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Painel de Controle">
      {/* Alertas Operacionais */}
      {overview.pendingEntities > 0 && (
        <div className="admin-alert-box">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertTriangle size={18} color="#991b1b" />
            <h4 className="admin-alert-title">Ação necessária</h4>
          </div>
          <p className="admin-alert-desc">
            Existem {overview.pendingEntities} entidades parceiras aguardando aprovação para começar a validar famílias.
          </p>
        </div>
      )}

      {/* KPI Grid */}
      <div className="admin-kpi-grid">
        <KpiCard
          label="Total de Usuários"
          value={overview.totalUsers}
          icon={<Users size={20} />}
          variant="primary"
        />
        <KpiCard
          label="Doador / Beneficiário"
          value={`${overview.donors} / ${overview.beneficiaries}`}
          icon={<TrendingUp size={20} />}
          variant="info"
        />
        <KpiCard
          label="Entidades Parceiras"
          value={`${overview.entities} (${overview.pendingEntities} pendentes)`}
          icon={<Building2 size={20} />}
          variant="warning"
        />
        <KpiCard
          label="Total de Doações"
          value={`R$ ${overview.totalAmountDonated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<Heart size={20} />}
          variant="success"
        />
      </div>

      <div className="admin-dashboard-row">
        {/* Coluna Esquerda: Tabelas e Gráficos */}
        <div className="flex-col gap-4">
          
          {/* Gráfico Simples de Doações */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Volume de Doações (Últimos 4 Meses)</h3>
            </div>
            <div className="admin-card-body">
              <div className="admin-chart-mock">
                <div className="admin-chart-bar-wrapper">
                  <div className="admin-chart-bar" style={{ height: '35%' }}>R$3,5k</div>
                  <span className="admin-chart-label">Março</span>
                </div>
                <div className="admin-chart-bar-wrapper">
                  <div className="admin-chart-bar" style={{ height: '55%' }}>R$5,5k</div>
                  <span className="admin-chart-label">Abril</span>
                </div>
                <div className="admin-chart-bar-wrapper">
                  <div className="admin-chart-bar" style={{ height: '80%' }}>R$8,0k</div>
                  <span className="admin-chart-label">Maio</span>
                </div>
                <div className="admin-chart-bar-wrapper">
                  <div className="admin-chart-bar" style={{ height: '45%' }}>R$4,6k</div>
                  <span className="admin-chart-label">Junho</span>
                </div>
              </div>
            </div>
          </div>

          {/* Indicações Recentes */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Indicações Pendentes Recentes</h3>
              <Link to="/admin/indications" style={{ fontSize: '12px', color: '#0d6e6e', fontWeight: '600', textDecoration: 'none' }}>
                Ver todas →
              </Link>
            </div>
            <div className="admin-card-body" style={{ padding: 0 }}>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Representante</th>
                      <th>Região</th>
                      <th>Crianças</th>
                      <th>Indicado por</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indications.map((ind) => (
                      <tr key={ind.id}>
                        <td style={{ fontWeight: '600' }}>{ind.representativeName}</td>
                        <td>{ind.region}</td>
                        <td>{ind.childrenCount}</td>
                        <td>{ind.indicatedByName}</td>
                        <td>
                          <StatusBadge status={ind.status} />
                        </td>
                      </tr>
                    ))}
                    {indications.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>
                          Nenhuma indicação pendente recente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Coluna Direita: Entidades Pendentes e Atividade Recente */}
        <div className="flex-col gap-4">
          
          {/* Entidades Aguardando Aprovação */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Aprovação de Entidades</h3>
              <Link to="/admin/entities" style={{ fontSize: '12px', color: '#0d6e6e', fontWeight: '600', textDecoration: 'none' }}>
                Gerenciar
              </Link>
            </div>
            <div className="admin-card-body">
              {entities.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', margin: '20px 0' }}>
                  Nenhuma entidade aguardando aprovação.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {entities.map((ent) => (
                    <div key={ent.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{ent.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>CNPJ: {ent.cnpj}</div>
                      </div>
                      <ArrowRight size={16} color="#0d6e6e" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Últimas Ações Administrativas */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Últimas Ações de Auditoria</h3>
              <Link to="/admin/audit-logs" style={{ fontSize: '12px', color: '#0d6e6e', fontWeight: '600', textDecoration: 'none' }}>
                Ver logs
              </Link>
            </div>
            <div className="admin-card-body">
              <div className="admin-activity-list">
                {logs.map((log) => (
                  <div key={log.id} className="admin-activity-item">
                    <div className="admin-activity-avatar">
                      <ShieldAlert size={14} color="#0b2239" />
                    </div>
                    <div className="admin-activity-content">
                      <p className="admin-activity-text">
                        <strong>{log.adminName}</strong> executou <code>{log.action}</code> em <strong>{log.entityName}</strong>
                      </p>
                      <span className="admin-activity-time">{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
