import React, { useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import StatusBadge from '../components/StatusBadge';
import { Search, Shield } from 'lucide-react';
import { previewUsers, type PreviewUser } from '../dev/adminPreviewData';
import { useToast } from '../../context/ToastContext';

const UsersList: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<PreviewUser[]>(previewUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filtered = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleChangeRole = (id: string, currentRole: string, name: string) => {
    const newRole = prompt(`Alterar a role de ${name} (Atual: ${currentRole}). Escolha: donor, entity, beneficiary, admin`);
    if (!newRole) return;
    const validRoles = ['donor', 'entity', 'beneficiary', 'admin'];
    if (!validRoles.includes(newRole.trim().toLowerCase())) {
      showToast('Role inválida selecionada.', 'error');
      return;
    }
    
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: newRole.trim().toLowerCase() as PreviewUser['role'] } : u))
    );
    showToast(`Role de ${name} alterada para ${newRole.trim().toLowerCase()} com sucesso!`, 'success');
  };

  return (
    <AdminLayout title="Gestão de Usuários">
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Usuários da Plataforma</h3>
        </div>
        <div className="admin-card-body">
          <div className="admin-filters-bar">
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <input
                type="text"
                className="admin-form-input"
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            </div>

            <select
              className="admin-form-input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ maxWidth: '200px' }}
            >
              <option value="all">Todos os Perfis</option>
              <option value="donor">Doador (donor)</option>
              <option value="entity">Entidade (entity)</option>
              <option value="beneficiary">Beneficiário (beneficiary)</option>
              <option value="admin">Administrador (admin)</option>
            </select>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome do Usuário</th>
                  <th>E-mail</th>
                  <th>Perfil (Role)</th>
                  <th>Status</th>
                  <th>Data de Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td><code>{u.id}</code></td>
                    <td style={{ fontWeight: '600' }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      <strong>{u.role}</strong>
                    </td>
                    <td>
                      <StatusBadge status={u.status} />
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div className="admin-table-actions">
                        <button
                          onClick={() => handleChangeRole(u.id, u.role, u.name)}
                          className="admin-btn-action"
                          style={{ borderColor: '#0b2239', color: '#0b2239' }}
                          title="Alterar Role do Usuário"
                        >
                          <Shield size={12} />
                          Alterar Role
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Nenhum usuário encontrado.
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

export default UsersList;
