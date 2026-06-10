import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const routeLabels: Record<string, string> = {
  admin: 'Dashboard',
  indications: 'Indicações',
  families: 'Famílias',
  entities: 'Entidades',
  users: 'Usuários',
  donations: 'Doações',
  'audit-logs': 'Logs de Auditoria',
};

const AdminBreadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Se for apenas "/admin", não precisa de breadcrumbs longos
  if (pathnames.length <= 1) {
    return (
      <div className="admin-breadcrumbs">
        <span className="admin-breadcrumb-active">Dashboard</span>
      </div>
    );
  }

  return (
    <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
      <Link to="/admin" className="admin-breadcrumb-item">
        Início
      </Link>
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const label = routeLabels[value] || value;

        // Pula o primeiro item se for o próprio "/admin"
        if (value === 'admin') return null;

        return (
          <React.Fragment key={to}>
            <span className="admin-breadcrumb-separator">/</span>
            {last ? (
              <span className="admin-breadcrumb-active">{label}</span>
            ) : (
              <Link to={to} className="admin-breadcrumb-item">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default AdminBreadcrumbs;
