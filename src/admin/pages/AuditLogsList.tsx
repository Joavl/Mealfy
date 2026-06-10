import React, { useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { Search } from 'lucide-react';
import { previewAuditLogs, type PreviewAuditLog } from '../dev/adminPreviewData';

const AuditLogsList: React.FC = () => {
  const [logs] = useState<PreviewAuditLog[]>(previewAuditLogs);
  const [search, setSearch] = useState('');

  const filtered = logs.filter((log) => {
    return log.adminName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entityName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AdminLayout title="Histórico de Auditoria">
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Ações Administrativas Registradas</h3>
        </div>
        <div className="admin-card-body">
          <div className="admin-filters-bar">
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <input
                type="text"
                className="admin-form-input"
                placeholder="Buscar por admin, ação, entidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            </div>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Administrador</th>
                  <th>Ação (Action)</th>
                  <th>Tipo</th>
                  <th>Alvo (Target)</th>
                  <th>Motivo / Observação</th>
                  <th>Endereço IP</th>
                  <th>Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td><code>{log.id}</code></td>
                    <td style={{ fontWeight: '600' }}>{log.adminName}</td>
                    <td>
                      <code style={{ color: '#0d6e6e', fontWeight: '700' }}>{log.action}</code>
                    </td>
                    <td>{log.entityType}</td>
                    <td>{log.entityName}</td>
                    <td>{log.reason || '—'}</td>
                    <td style={{ fontSize: '11px', color: '#64748b' }}>{log.ipAddress}</td>
                    <td>{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Nenhum registro de auditoria encontrado.
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

export default AuditLogsList;
