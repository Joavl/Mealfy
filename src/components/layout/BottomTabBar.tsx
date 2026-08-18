import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Soup, User, MapPin, LayoutDashboard, Users, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import './BottomTabBar.css';

const pillTransition = { type: 'spring' as const, stiffness: 380, damping: 30 };

const ActivePill: React.FC = () => (
  <motion.div layoutId="active-pill" className="active-pill" transition={pillTransition} />
);

const BottomTabBar: React.FC = () => {
  const { user } = useAppContext();

  if (!user) return null;

  // Donor Navigation: Início | Mapa | Alimente | Perfil
  if (user.role === 'donor') {
    return (
      <nav className="bottom-tab-bar glassmorphism">
        <NavLink to="/" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <ActivePill />}
              <Home size={22} strokeWidth={2} />
              <span>Início</span>
            </>
          )}
        </NavLink>
        <NavLink to="/map" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <ActivePill />}
              <MapPin size={22} strokeWidth={2} />
              <span>Mapa</span>
            </>
          )}
        </NavLink>
        <NavLink to="/donate" className={({ isActive }) => `tab-item donate-tab ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <ActivePill />}
              <Soup size={22} strokeWidth={2} />
              <span>Alimente</span>
            </>
          )}
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <ActivePill />}
              <User size={22} strokeWidth={2} />
              <span>Perfil</span>
            </>
          )}
        </NavLink>
      </nav>
    );
  }

  // Entity Navigation
  if (user.role === 'entity') {
    return (
      <nav className="bottom-tab-bar glassmorphism">
        <NavLink to="/entity/dashboard" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <ActivePill />}
              <LayoutDashboard size={22} strokeWidth={2} />
              <span>Painel</span>
            </>
          )}
        </NavLink>
        <NavLink to="/register-family" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <ActivePill />}
              <Users size={22} strokeWidth={2} />
              <span>Cadastrar</span>
            </>
          )}
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <ActivePill />}
              <User size={22} strokeWidth={2} />
              <span>Perfil</span>
            </>
          )}
        </NavLink>
      </nav>
    );
  }

  // Beneficiary Navigation
  if (user.role === 'beneficiary') {
    return (
      <nav className="bottom-tab-bar glassmorphism">
        <NavLink to="/beneficiary/dashboard" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <ActivePill />}
              <Home size={22} strokeWidth={2} />
              <span>Início</span>
            </>
          )}
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <ActivePill />}
              <User size={22} strokeWidth={2} />
              <span>Perfil</span>
            </>
          )}
        </NavLink>
      </nav>
    );
  }

  // Admin Navigation
  if (user.role === 'admin') {
    return (
      <nav className="bottom-tab-bar glassmorphism">
        <NavLink to="/unauthorized" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <ActivePill />}
              <ShieldCheck size={22} strokeWidth={2} />
              <span>Admin</span>
            </>
          )}
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          {({ isActive }) => (
            <>
              {isActive && <ActivePill />}
              <User size={22} strokeWidth={2} />
              <span>Perfil</span>
            </>
          )}
        </NavLink>
      </nav>
    );
  }

  // Default Fallback
  return (
    <nav className="bottom-tab-bar glassmorphism">
      <NavLink to="/dashboard-redirect" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
        {({ isActive }) => (
          <>
            {isActive && <ActivePill />}
            <Home size={22} strokeWidth={2} />
            <span>Início</span>
          </>
        )}
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
        {({ isActive }) => (
          <>
            {isActive && <ActivePill />}
            <User size={22} strokeWidth={2} />
            <span>Perfil</span>
          </>
        )}
      </NavLink>
    </nav>
  );
};

export default BottomTabBar;
