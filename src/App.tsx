import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import BottomTabBar from './components/layout/BottomTabBar';
import { ToastProvider } from './context/ToastContext';
import type { UserRole } from './backend/types';

import Home from './pages/Home';
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

// Component to protect private routes with role awareness
const PrivateRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: UserRole[] }) => {
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

// Global Layout wrapper
const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAppContext();
  
  // We hide the bottom tab bar on certain screens
  const hideTabBarRoutes = ['/auth', '/register', '/register-beneficiary', '/donate', '/success', '/unauthorized'];
  const isHiddenRoute = hideTabBarRoutes.some(route => location.pathname.startsWith(route));
  
  // Hide if beneficiary or admin (they have their own navigation or are simple)
  // Actually, keep it for all but hide on specific pages
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

function App() {
  return (
      <AppProvider>
        <ToastProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/register" element={<Register />} />
                <Route path="/register-donor" element={<Register initialStep="donor" />} />
                <Route path="/register-entity" element={<Register initialStep="entity" />} />
                <Route path="/register-beneficiary" element={<RegisterBeneficiary />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Common Public/Semi-Public Routes (Restricted for Beneficiaries) */}
            <Route path="/community/:id" element={<PrivateRoute allowedRoles={['donor', 'entity']}><CommunityDetails /></PrivateRoute>} />
            <Route path="/family/:id" element={<PrivateRoute allowedRoles={['donor', 'entity', 'admin']}><FamilyDetails /></PrivateRoute>} />
            <Route path="/support" element={<Support />} />
            <Route path="/help" element={<Help />} />

            {/* Donor Routes */}
            <Route path="/" element={<PrivateRoute allowedRoles={['donor']}><Home /></PrivateRoute>} />
            <Route path="/explore" element={<PrivateRoute allowedRoles={['donor']}><Explore /></PrivateRoute>} />
            <Route path="/map" element={<PrivateRoute allowedRoles={['donor']}><MapView /></PrivateRoute>} />
            <Route path="/donate" element={<PrivateRoute allowedRoles={['donor']}><DonationChoice /></PrivateRoute>} />
            <Route path="/big-donation" element={<PrivateRoute allowedRoles={['donor']}><BigDonation /></PrivateRoute>} />
            <Route path="/success" element={<PrivateRoute allowedRoles={['donor']}><Success /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/recurrence" element={<PrivateRoute allowedRoles={['donor']}><Recurrence /></PrivateRoute>} />
            <Route path="/indicate-family" element={<PrivateRoute allowedRoles={['donor']}><IndicateFamily /></PrivateRoute>} />

            {/* Entity Routes */}
            <Route path="/register-family" element={<PrivateRoute allowedRoles={['entity', 'donor']}><RegisterFamily /></PrivateRoute>} />
            <Route path="/entity/dashboard" element={<PrivateRoute allowedRoles={['entity']}><EntityDashboard /></PrivateRoute>} />
            
            {/* Beneficiary Routes */}
            <Route path="/beneficiary/dashboard" element={<PrivateRoute allowedRoles={['beneficiary']}><BeneficiaryDashboard /></PrivateRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<PrivateRoute allowedRoles={['admin']}><AdminDashboard /></PrivateRoute>} />
            <Route path="/admin/featured-donors" element={<PrivateRoute allowedRoles={['admin']}><AdminFeaturedDonors /></PrivateRoute>} />

            {/* Automatic Redirect based on Role */}
            <Route path="/dashboard-redirect" element={<DashboardRedirect />} />

            <Route path="*" element={<Navigate to="/dashboard-redirect" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
        </ToastProvider>
    </AppProvider>
  );
}

// Helper component to redirect user to their specific home
const DashboardRedirect = () => {
  const { user, isAuthenticated } = useAppContext();
  
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  
  switch(user?.role) {
    case 'admin': return <Navigate to="/admin/dashboard" replace />;
    case 'entity': return <Navigate to="/entity/dashboard" replace />;
    case 'beneficiary': return <Navigate to="/beneficiary/dashboard" replace />;
    case 'donor': default: return <Navigate to="/" replace />;
  }
};

export default App;
