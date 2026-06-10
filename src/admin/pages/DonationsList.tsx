import React, { useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { Search } from 'lucide-react';
import { previewDonations, type PreviewDonation } from '../dev/adminPreviewData';

const DonationsList: React.FC = () => {
  const [donations] = useState<PreviewDonation[]>(previewDonations);
  const [search, setSearch] = useState('');

  const filtered = donations.filter((d) => {
    return d.donorName.toLowerCase().includes(search.toLowerCase()) ||
      d.familyRepresentative.toLowerCase().includes(search.toLowerCase());
  });

  const totalSum = filtered.reduce((acc, d) => acc + d.amount, 0);

  return (
    <AdminLayout title="Histórico de Doações">
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Doações Realizadas na Rede</h3>
          <span style={{ fontWeight: '700', fontSize: '14px', color: '#0d6e6e' }}>
            Total Filtrado: R$ {totalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="admin-card-body">
          <div className="admin-filters-bar">
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <input
                type="text"
                className="admin-form-input"
                placeholder="Buscar por doador ou família..."
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
                  <th>ID</th>
                  <th>Doador</th>
                  <th>Família Beneficiada</th>
                  <th>Valor da Cesta</th>
                  <th>Mensagem do Doador</th>
                  <th>Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td><code>{d.id}</code></td>
                    <td style={{ fontWeight: '600' }}>{d.donorName}</td>
                    <td>{d.familyRepresentative}</td>
                    <td style={{ fontWeight: '700', color: '#10b981' }}>
                      R$ {d.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ fontStyle: 'italic', color: '#475569' }}>
                      {d.message ? `"${d.message}"` : '—'}
                    </td>
                    <td>{new Date(d.createdAt).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Nenhuma doação encontrada.
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

export default DonationsList;
