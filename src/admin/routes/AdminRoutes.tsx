import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

// Componente de Proteção de Rota
interface ProtectedAdminRouteProps {
  children: React.ReactElement;
}

export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const { user } = useAppContext();
  const isPreview = import.meta.env.VITE_ADMIN_PREVIEW === 'true';

  if (isPreview) {
    const hasPreviewToken = sessionStorage.getItem('admin_token') === 'preview_token_123';
    return hasPreviewToken ? children : <Navigate to="/admin/login" replace />;
  }

  // Integração real: verifica se o usuário está autenticado e possui papel admin
  const isRealAdmin = user && user.role === 'admin' && user.status === 'active';
  const hasToken = sessionStorage.getItem('admin_token') !== null;

  return (isRealAdmin || hasToken) ? children : <Navigate to="/admin/login" replace />;
};

// Lazy Imports das Páginas Administrativas
const AdminLogin = lazy(() => import('../pages/AdminLogin'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const IndicationsList = lazy(() => import('../pages/IndicationsList'));
const FamiliesList = lazy(() => import('../pages/FamiliesList'));
const EntitiesList = lazy(() => import('../pages/EntitiesList'));
const UsersList = lazy(() => import('../pages/UsersList'));
const DonationsList = lazy(() => import('../pages/DonationsList'));
const AuditLogsList = lazy(() => import('../pages/AuditLogsList'));

// Componente de carregamento para o Suspense
const AdminLoading: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f8fafc', color: '#64748b', fontFamily: 'sans-serif' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: '30px', height: '30px', border: '3px solid rgba(13, 110, 110, 0.2)', borderTopColor: '#0d6e6e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px auto' }} />
      <span>Carregando página administrativa...</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

const AdminRoutes: React.FC = () => {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Routes>
        {/* Rota de login sem sidebar */}
        <Route path="login" element={<AdminLogin />} />

        {/* Rotas protegidas */}
        <Route
          path=""
          element={
            <ProtectedAdminRoute>
              <Dashboard />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="indications"
          element={
            <ProtectedAdminRoute>
              <IndicationsList />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="families"
          element={
            <ProtectedAdminRoute>
              <FamiliesList />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="entities"
          element={
            <ProtectedAdminRoute>
              <EntitiesList />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedAdminRoute>
              <UsersList />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="donations"
          element={
            <ProtectedAdminRoute>
              <DonationsList />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <ProtectedAdminRoute>
              <AuditLogsList />
            </ProtectedAdminRoute>
          }
        />

        {/* Fallback para redirecionar para o dashboard */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AdminRoutes;
