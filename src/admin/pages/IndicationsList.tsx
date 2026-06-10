import React, { useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import StatusBadge from '../components/StatusBadge';
import {
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { previewIndications, type PreviewIndication } from '../dev/adminPreviewData';
import { useToast } from '../../context/ToastContext';

const IndicationsList: React.FC = () => {
  const { showToast } = useToast();
  const [indications, setIndications] = useState<PreviewIndication[]>(previewIndications);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Estados do Modal
  const [selectedInd, setSelectedInd] = useState<PreviewIndication | null>(null);
  const [justification, setJustification] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'convert' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = indications.filter((ind) => {
    const matchesSearch = ind.representativeName.toLowerCase().includes(search.toLowerCase()) ||
      ind.region.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ind.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openActionModal = (ind: PreviewIndication, type: 'approve' | 'reject' | 'convert') => {
    setSelectedInd(ind);
    setActionType(type);
    setJustification('');
  };

  const closeActionModal = () => {
    setSelectedInd(null);
    setActionType(null);
    setJustification('');
  };

  const handleConfirmAction = async () => {
    if (!selectedInd || !actionType) return;
    if ((actionType === 'reject') && !justification.trim()) {
      showToast('A justificativa é obrigatória para rejeições.', 'error');
      return;
    }

    setSubmitting(true);
    // Simular delay de chamada à API
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIndications((prev) =>
      prev.map((ind) => {
        if (ind.id === selectedInd.id) {
          return {
            ...ind,
            status: actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'converted',
          };
        }
        return ind;
      })
    );

    const actionText = actionType === 'approve' ? 'aprovada' : actionType === 'reject' ? 'rejeitada' : 'convertida em família';
    showToast(`Indicação de ${selectedInd.representativeName} foi ${actionText} com sucesso!`, 'success');
    
    setSubmitting(false);
    closeActionModal();
  };

  return (
    <AdminLayout title="Gestão de Indicações">
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Listagem de Indicações de Famílias</h3>
        </div>
        <div className="admin-card-body">
          {/* Barra de Filtros */}
          <div className="admin-filters-bar">
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <input
                type="text"
                className="admin-form-input"
                placeholder="Buscar por nome ou região..."
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
              <option value="converted">Convertidas</option>
            </select>
          </div>

          {/* Tabela de Indicações */}
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Representante</th>
                  <th>Região</th>
                  <th>Crianças</th>
                  <th>Indicado por</th>
                  <th>Data de Envio</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ind) => (
                  <tr key={ind.id}>
                    <td style={{ fontWeight: '600' }}>{ind.representativeName}</td>
                    <td>{ind.region}</td>
                    <td>{ind.childrenCount}</td>
                    <td>{ind.indicatedByName}</td>
                    <td>{new Date(ind.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <StatusBadge status={ind.status} />
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <button
                          onClick={() => openActionModal(ind, 'approve')}
                          className="admin-btn-action success"
                          disabled={ind.status !== 'pending'}
                          title="Aprovar indicação"
                        >
                          <CheckCircle size={12} />
                          Aprovar
                        </button>
                        <button
                          onClick={() => openActionModal(ind, 'reject')}
                          className="admin-btn-action danger"
                          disabled={ind.status !== 'pending'}
                          title="Rejeitar indicação"
                        >
                          <XCircle size={12} />
                          Rejeitar
                        </button>
                        <button
                          onClick={() => openActionModal(ind, 'convert')}
                          className="admin-btn-action"
                          disabled={ind.status !== 'approved'}
                          style={{ borderColor: '#0d6e6e', color: '#0d6e6e' }}
                          title="Converter em Família Oficial"
                        >
                          <RefreshCw size={12} />
                          Converter
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Nenhuma indicação encontrada para os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Moderação */}
      {selectedInd && actionType && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              {actionType === 'approve' && 'Aprovar Indicação'}
              {actionType === 'reject' && 'Rejeitar Indicação'}
              {actionType === 'convert' && 'Converter em Família Oficial'}
            </div>
            <div className="admin-modal-body">
              <p style={{ fontSize: '14px', color: '#1e293b', marginBottom: '16px' }}>
                Você está prestes a alterar o status da indicação de <strong>{selectedInd.representativeName}</strong> ({selectedInd.region}).
              </p>
              
              {selectedInd.observation && (
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569', marginBottom: '16px', fontStyle: 'italic' }}>
                  "{selectedInd.observation}"
                </div>
              )}

              {actionType === 'reject' && (
                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="reject-reason">Justificativa da Rejeição (obrigatório)</label>
                  <textarea
                    id="reject-reason"
                    className="admin-form-input"
                    rows={4}
                    placeholder="Informe o motivo da rejeição..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    style={{ resize: 'vertical' }}
                    required
                  />
                </div>
              )}

              {actionType === 'convert' && (
                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="convert-reason">Observação de Conversão (opcional)</label>
                  <textarea
                    id="convert-reason"
                    className="admin-form-input"
                    rows={2}
                    placeholder="Adicionar observações para o cadastro da família..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button onClick={closeActionModal} className="admin-btn-action" disabled={submitting}>
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                className={`admin-btn-action ${actionType === 'reject' ? 'danger' : 'success'}`}
                disabled={submitting}
              >
                {submitting ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default IndicationsList;
