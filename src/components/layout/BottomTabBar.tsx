import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Heart, MapPin, User, LayoutDashboard, Users, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import './BottomTabBar.css';

const BottomTabBar: React.FC = () => {
  const { user } = useAppContext();

  if (!user) return null;

  // Apoiador (donor) — 4 abas: Início, Alimentar, Mapa, Perfil
  if (user.role === 'donor') {
    return (
      <nav className="bottom-tab-bar" aria-label="Navegação principal">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Início"
        >
          <span className="tab-icon-wrapper">
            <Home size={22} />
          </span>
          <span className="tab-label">Início</span>
        </NavLink>

        <NavLink
          to="/feed"
          className={({ isActive }) => `tab-item tab-item--feed${isActive ? ' active' : ''}`}
          aria-label="Alimentar"
        >
          <span className="tab-icon-wrapper">
            <Heart size={22} />
          </span>
          <span className="tab-label">Alimentar</span>
        </NavLink>

        <NavLink
          to="/map"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Mapa"
        >
          <span className="tab-icon-wrapper">
            <MapPin size={22} />
          </span>
          <span className="tab-label">Mapa</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Perfil"
        >
          <span className="tab-icon-wrapper">
            <User size={22} />
          </span>
          <span className="tab-label">Perfil</span>
        </NavLink>
      </nav>
    );
  }

  // Entidade — Painel, Cadastrar, Perfil
  if (user.role === 'entity') {
    return (
      <nav className="bottom-tab-bar" aria-label="Navegação da entidade">
        <NavLink
          to="/entity/dashboard"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Painel"
        >
          <span className="tab-icon-wrapper">
            <LayoutDashboard size={22} />
          </span>
          <span className="tab-label">Painel</span>
        </NavLink>
        <NavLink
          to="/register-family"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Cadastrar família"
        >
          <span className="tab-icon-wrapper">
            <Users size={22} />
          </span>
          <span className="tab-label">Cadastrar</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Perfil"
        >
          <span className="tab-icon-wrapper">
            <User size={22} />
          </span>
          <span className="tab-label">Perfil</span>
        </NavLink>
      </nav>
    );
  }

  // Beneficiário — Início, Perfil
  if (user.role === 'beneficiary') {
    return (
      <nav className="bottom-tab-bar" aria-label="Navegação">
        <NavLink
          to="/beneficiary/dashboard"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Início"
        >
          <span className="tab-icon-wrapper">
            <Home size={22} />
          </span>
          <span className="tab-label">Início</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Perfil"
        >
          <span className="tab-icon-wrapper">
            <User size={22} />
          </span>
          <span className="tab-label">Perfil</span>
        </NavLink>
      </nav>
    );
  }

  // Admin — Admin, Perfil
  if (user.role === 'admin') {
    return (
      <nav className="bottom-tab-bar" aria-label="Navegação admin">
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Admin"
        >
          <span className="tab-icon-wrapper">
            <ShieldCheck size={22} />
          </span>
          <span className="tab-label">Admin</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Perfil"
        >
          <span className="tab-icon-wrapper">
            <User size={22} />
          </span>
          <span className="tab-label">Perfil</span>
        </NavLink>
      </nav>
    );
  }

  return null;
};

export default BottomTabBar;
