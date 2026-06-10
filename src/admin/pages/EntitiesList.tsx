import React, { useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import StatusBadge from '../components/StatusBadge';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { previewEntities, type PreviewEntity } from '../dev/adminPreviewData';
import { useToast } from '../../context/ToastContext';

const EntitiesList: React.FC = () => {
  const { showToast } = useToast();
  const [entities, setEntities] = useState<PreviewEntity[]>(previewEntities);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = entities.filter((ent) => {
    const matchesSearch = ent.name.toLowerCase().includes(search.toLowerCase()) ||
      ent.cnpj.includes(search) || ent.region.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = (id: string, name: string) => {
    setEntities((prev) =>
      prev.map((ent) => (ent.id === id ? { ...ent, status: 'approved' } : ent))
    );
    showToast(`Entidade ${name} foi aprovada com sucesso!`, 'success');
  };

  const handleReject = (id: string, name: string) => {
    const reason = prompt(`Informe a justificativa da rejeição para a entidade ${name}:`);
    if (reason === null) return; // cancelado
    if (!reason.trim()) {
      showToast('A justificativa é obrigatória para rejeições.', 'error');
      return;
    }
    setEntities((prev) =>
      prev.map((ent) => (ent.id === id ? { ...ent, status: 'rejected' } : ent))
    );
    showToast(`Entidade ${name} foi rejeitada.`, 'success');
  };

  return (
    <AdminLayout title="Gestão de Entidades">
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Entidades e ONGs Parceiras</h3>
        </div>
        <div className="admin-card-body">
          <div className="admin-filters-bar">
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <input
                type="text"
                className="admin-form-input"
                placeholder="Buscar por nome, CNPJ, região..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            </div>

            <select
              className="admin-form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ maxWidth: '200px' }}
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovadas</option>
              <option value="rejected">Rejeitadas</option>
            </select>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome da ONG / Organização</th>
                  <th>CNPJ</th>
                  <th>Responsável</th>
                  <th>E-mail</th>
                  <th>Região</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ent) => (
                  <tr key={ent.id}>
                    <td style={{ fontWeight: '600' }}>{ent.name}</td>
                    <td>{ent.cnpj}</td>
                    <td>{ent.responsibleName}</td>
                    <td>{ent.email}</td>
                    <td>{ent.region}</td>
                    <td>
                      <StatusBadge status={ent.status} />
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <button
                          onClick={() => handleApprove(ent.id, ent.name)}
                          className="admin-btn-action success"
                          disabled={ent.status !== 'pending'}
                          title="Aprovar cadastro"
                        >
                          <CheckCircle size={12} />
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleReject(ent.id, ent.name)}
                          className="admin-btn-action danger"
                          disabled={ent.status !== 'pending'}
                          title="Rejeitar cadastro"
                        >
                          <XCircle size={12} />
                          Rejeitar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Nenhuma entidade parceira encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default EntitiesList;
