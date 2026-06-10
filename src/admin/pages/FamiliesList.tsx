import React, { useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import StatusBadge from '../components/StatusBadge';
import { Search, Plus, Eye, Trash2 } from 'lucide-react';
import { previewFamilies, type PreviewFamily } from '../dev/adminPreviewData';
import { useToast } from '../../context/ToastContext';

const FamiliesList: React.FC = () => {
  const { showToast } = useToast();
  const [families, setFamilies] = useState<PreviewFamily[]>(previewFamilies);
  const [search, setSearch] = useState('');
  const [supportFilter, setSupportFilter] = useState('all');

  const filtered = families.filter((f) => {
    const matchesSearch = f.representativeName.toLowerCase().includes(search.toLowerCase()) ||
      f.region.toLowerCase().includes(search.toLowerCase());
    const matchesSupport = supportFilter === 'all' || f.supportStatus === supportFilter;
    return matchesSearch && matchesSupport;
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir a família ${name}? A exclusão será lógica (Soft Delete).`)) {
      setFamilies((prev) => prev.filter((f) => f.id !== id));
      showToast(`Família ${name} excluída logicamente com sucesso.`, 'success');
    }
  };

  return (
    <AdminLayout title="Gestão de Famílias">
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Famílias Oficiais Cadastradas</h3>
          <button
            onClick={() => showToast('Cadastro direto de família via Admin (Em breve)', 'info')}
            className="admin-btn-action success"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} />
            Cadastrar Família
          </button>
        </div>
        <div className="admin-card-body">
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
              value={supportFilter}
              onChange={(e) => setSupportFilter(e.target.value)}
              style={{ maxWidth: '200px' }}
            >
              <option value="all">Status de Suporte</option>
              <option value="needs_help">Precisa de Ajuda</option>
              <option value="supported">Apoiado</option>
              <option value="fed">Alimentado</option>
            </select>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Representante</th>
                  <th>Região</th>
                  <th>Crianças</th>
                  <th>Cadastro</th>
                  <th>Ajuda</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td><code>{f.id}</code></td>
                    <td style={{ fontWeight: '600' }}>{f.representativeName}</td>
                    <td>{f.region}</td>
                    <td>{f.childrenCount}</td>
                    <td>
                      <StatusBadge status={f.status} />
                    </td>
                    <td>
                      <StatusBadge status={f.supportStatus} />
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <button
                          onClick={() => showToast(`Detalhes da família ${f.representativeName} (Em breve)`, 'info')}
                          className="admin-btn-action"
                          title="Visualizar detalhes"
                        >
                          <Eye size={12} />
                          Ver
                        </button>
                        <button
                          onClick={() => handleDelete(f.id, f.representativeName)}
                          className="admin-btn-action danger"
                          title="Excluir (Soft Delete)"
                        >
                          <Trash2 size={12} />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Nenhuma família encontrada.
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

export default FamiliesList;
