import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import BottomTabBar from './components/layout/BottomTabBar';
import { ToastProvider } from './context/ToastContext';
import type { UserRole } from './backend/types';

import Home from './pages/Home';
import Feed from './pages/Feed';
import DonationChoice from './pages/DonationChoice';
import Auth from './pages/Auth';
import Success from './pages/Success';
import Explore from './pages/Explore';
import Profile from './pages/Profile';
import CommunityDetails from './pages/CommunityDetails';
import MapView from './pages/MapView';
import FamilyDetails from './pages/FamilyDetails';
import BigDonation from './pages/BigDonation';
import Support from './pages/Support';
import Help from './pages/Help';
import Recurrence from './pages/Recurrence';
import RegisterFamily from './pages/RegisterFamily';
import EntityDashboard from './pages/EntityDashboard';
import BeneficiaryDashboard from './pages/BeneficiaryDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminFeaturedDonors from './pages/AdminFeaturedDonors';
import Unauthorized from './pages/Unauthorized';
import Register from './pages/Register';
import RegisterBeneficiary from './pages/RegisterBeneficiary';
import IndicateFamily from './pages/IndicateFamily';

import './App.css';

// ─── PrivateRoute ──────────────────────────────────────────
// Protege rotas com autenticação e verificação de role.
const PrivateRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) => {
  const { isAuthenticated, user } = useAppContext();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// ─── DonateRedirect ────────────────────────────────────────
// Rota /donate legada. Encaminha estado de família/lote para
// /donate-confirm (checkout), e sem estado vai para /feed.
const DonateRedirect = () => {
  const location = useLocation();
  const hasTargetFamily = Boolean(location.state?.targetFamily);
  const hasBatch = Boolean(location.state?.selectedFamilyIds?.length);

  if (hasTargetFamily || hasBatch) {
    return (
      <Navigate to="/donate-confirm" state={location.state} replace />
    );
  }

  return <Navigate to="/feed" replace />;
};

// ─── Layout ────────────────────────────────────────────────
// Wrapper global que controla visibilidade da BottomTabBar.
const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  // Ocultar tab bar em telas de checkout concentrado, auth e fluxos modais
  const hideTabBarRoutes = [
    '/auth',
    '/register',
    '/register-beneficiary',
    '/donate-confirm',
    '/success',
    '/unauthorized',
  ];
  const isHiddenRoute = hideTabBarRoutes.some(route =>
    location.pathname.startsWith(route),
  );

  const showTabBar = !isHiddenRoute;

  return (
    <div className="app-wrapper">
      <div className={`page-content ${showTabBar ? 'with-tab-bar' : ''}`}>
        {children}
      </div>
      {showTabBar && <BottomTabBar />}
    </div>
  );
};

// ─── DashboardRedirect ─────────────────────────────────────
// Redireciona usuário autenticado para o home correto por role.
const DashboardRedirect = () => {
  const { user, isAuthenticated } = useAppContext();

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  switch (user?.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'entity':
      return <Navigate to="/entity/dashboard" replace />;
    case 'beneficiary':
      return <Navigate to="/beneficiary/dashboard" replace />;
    case 'donor':
    default:
      return <Navigate to="/" replace />;
  }
};

// ─── App ───────────────────────────────────────────────────
function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              {/* ── Rotas públicas ───────────────────────── */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register-donor" element={<Register initialStep="donor" />} />
              <Route path="/register-entity" element={<Register initialStep="entity" />} />
              <Route path="/register-beneficiary" element={<RegisterBeneficiary />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* ── Rotas semi-públicas ───────────────────── */}
              <Route
                path="/community/:id"
                element={
                  <PrivateRoute allowedRoles={['donor', 'entity']}>
                    <CommunityDetails />
                  </PrivateRoute>
                }
              />
              <Route
                path="/family/:id"
                element={
                  <PrivateRoute allowedRoles={['donor', 'entity', 'admin']}>
                    <FamilyDetails />
                  </PrivateRoute>
                }
              />
              <Route path="/support" element={<Support />} />
              <Route path="/help" element={<Help />} />

              {/* ── Rotas do apoiador (donor) ─────────────── */}
              <Route
                path="/"
                element={
                  <PrivateRoute allowedRoles={['donor']}>
                    <Home />
                  </PrivateRoute>
                }
              />

              {/* Nova rota canônica da aba Alimentar */}
              <Route
                path="/feed"
                element={
                  <PrivateRoute allowedRoles={['donor']}>
                    <Feed />
                  </PrivateRoute>
                }
              />

              {/* Checkout de doação — DonationChoice movido para /donate-confirm */}
              <Route
                path="/donate-confirm"
                element={
                  <PrivateRoute allowedRoles={['donor']}>
                    <DonationChoice />
                  </PrivateRoute>
                }
              />

              {/* /donate legado → redirect inteligente (mantém estado) */}
              <Route path="/donate" element={<DonateRedirect />} />

              {/* /explore legado → redirect para /map */}
              <Route path="/explore" element={<Navigate to="/map" replace />} />

              {/* Rota Explorar mantida para compatibilidade interna se necessário */}
              <Route
                path="/explore-legacy"
                element={
                  <PrivateRoute allowedRoles={['donor']}>
                    <Explore />
                  </PrivateRoute>
                }
              />

              <Route
                path="/map"
                element={
                  <PrivateRoute allowedRoles={['donor']}>
                    <MapView />
                  </PrivateRoute>
                }
              />
              <Route
                path="/big-donation"
                element={
                  <PrivateRoute allowedRoles={['donor']}>
                    <BigDonation />
                  </PrivateRoute>
                }
              />
              <Route
                path="/success"
                element={
                  <PrivateRoute allowedRoles={['donor']}>
                    <Success />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route
                path="/recurrence"
                element={
                  <PrivateRoute allowedRoles={['donor']}>
                    <Recurrence />
                  </PrivateRoute>
                }
              />
              {/* IndicateFamily — mantida mas funcionalidade desabilitada (Fase 2) */}
              <Route
                path="/indicate-family"
                element={
                  <PrivateRoute allowedRoles={['donor']}>
                    <IndicateFamily />
                  </PrivateRoute>
                }
              />

              {/* ── Rotas da entidade ─────────────────────── */}
              <Route
                path="/register-family"
                element={
                  <PrivateRoute allowedRoles={['entity', 'donor']}>
                    <RegisterFamily />
                  </PrivateRoute>
                }
              />
              <Route
                path="/entity/dashboard"
                element={
                  <PrivateRoute allowedRoles={['entity']}>
                    <EntityDashboard />
                  </PrivateRoute>
                }
              />

              {/* ── Rotas do beneficiário ─────────────────── */}
              <Route
                path="/beneficiary/dashboard"
                element={
                  <PrivateRoute allowedRoles={['beneficiary']}>
                    <BeneficiaryDashboard />
                  </PrivateRoute>
                }
              />

              {/* ── Rotas do admin ────────────────────────── */}
              <Route
                path="/admin/dashboard"
                element={
                  <PrivateRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/featured-donors"
                element={
                  <PrivateRoute allowedRoles={['admin']}>
                    <AdminFeaturedDonors />
                  </PrivateRoute>
                }
              />

              {/* ── Redirect por role ─────────────────────── */}
              <Route path="/dashboard-redirect" element={<DashboardRedirect />} />

              {/* ── Wildcard ──────────────────────────────── */}
              <Route path="*" element={<Navigate to="/dashboard-redirect" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
