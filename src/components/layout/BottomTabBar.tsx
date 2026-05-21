import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Heart, Map, User, MapPin, LayoutDashboard, Users, ShieldCheck, Star } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import './BottomTabBar.css';

const BottomTabBar: React.FC = () => {
  const { user } = useAppContext();

  if (!user) return null;

  // Donor Navigation
  if (user.role === 'donor') {
    return (
      <nav className="bottom-tab-bar">
        <NavLink to="/" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <Home size={24} />
          <span>Início</span>
        </NavLink>
        <NavLink to="/donate" className={({ isActive }) => `tab-item donate-tab ${isActive ? 'active' : ''}`}>
          <div className="donate-icon-wrapper">
            <Heart size={28} color="white" fill="white" />
          </div>
          <span>Doar</span>
        </NavLink>
        <NavLink to="/explore" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <Map size={24} />
          <span>Regiões</span>
        </NavLink>
        <NavLink to="/map" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <MapPin size={24} />
          <span>Mapa</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <User size={24} />
          <span>Perfil</span>
        </NavLink>
      </nav>
    );
  }

  // Entity Navigation
  if (user.role === 'entity') {
    return (
      <nav className="bottom-tab-bar">
        <NavLink to="/entity/dashboard" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>Painel</span>
        </NavLink>
        <NavLink to="/register-family" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <Users size={24} />
          <span>Cadastrar</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <User size={24} />
          <span>Perfil</span>
        </NavLink>
      </nav>
    );
  }

  // Beneficiary Navigation
  if (user.role === 'beneficiary') {
    return (
      <nav className="bottom-tab-bar">
        <NavLink to="/beneficiary/dashboard" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <Home size={24} />
          <span>Início</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <User size={24} />
          <span>Perfil</span>
        </NavLink>
      </nav>
    );
  }

  // Admin Navigation
  if (user.role === 'admin') {
    return (
      <nav className="bottom-tab-bar">
        <NavLink to="/admin/dashboard" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <ShieldCheck size={24} />
          <span>Admin</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <User size={24} />
          <span>Perfil</span>
        </NavLink>
      </nav>
    );
  }

  // Default Fallback
  return (
    <nav className="bottom-tab-bar">
      <NavLink to="/dashboard-redirect" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
        <Home size={24} />
        <span>Início</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
        <User size={24} />
        <span>Perfil</span>
      </NavLink>
    </nav>
  );
};

export default BottomTabBar;
