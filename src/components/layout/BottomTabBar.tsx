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
          aria-current={undefined} // definido via className + data abaixo
        >
          {({ isActive }) => (
            <>
              <span className="tab-icon-wrapper" aria-hidden="true">
                <Home size={22} />
              </span>
              <span className="tab-label" aria-current={isActive ? 'page' : undefined}>
                Início
              </span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/feed"
          className={({ isActive }) => `tab-item tab-item--feed${isActive ? ' active' : ''}`}
          aria-label="Alimentar"
        >
          {({ isActive }) => (
            <>
              <span className="tab-icon-wrapper" aria-hidden="true">
                <Heart size={22} />
              </span>
              <span className="tab-label" aria-current={isActive ? 'page' : undefined}>
                Alimentar
              </span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/map"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Mapa"
        >
          {({ isActive }) => (
            <>
              <span className="tab-icon-wrapper" aria-hidden="true">
                <MapPin size={22} />
              </span>
              <span className="tab-label" aria-current={isActive ? 'page' : undefined}>
                Mapa
              </span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Perfil"
        >
          {({ isActive }) => (
            <>
              <span className="tab-icon-wrapper" aria-hidden="true">
                <User size={22} />
              </span>
              <span className="tab-label" aria-current={isActive ? 'page' : undefined}>
                Perfil
              </span>
            </>
          )}
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
          aria-label="Painel da entidade"
        >
          {({ isActive }) => (
            <>
              <span className="tab-icon-wrapper" aria-hidden="true">
                <LayoutDashboard size={22} />
              </span>
              <span className="tab-label" aria-current={isActive ? 'page' : undefined}>
                Painel
              </span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/register-family"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Cadastrar família"
        >
          {({ isActive }) => (
            <>
              <span className="tab-icon-wrapper" aria-hidden="true">
                <Users size={22} />
              </span>
              <span className="tab-label" aria-current={isActive ? 'page' : undefined}>
                Cadastrar
              </span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Perfil"
        >
          {({ isActive }) => (
            <>
              <span className="tab-icon-wrapper" aria-hidden="true">
                <User size={22} />
              </span>
              <span className="tab-label" aria-current={isActive ? 'page' : undefined}>
                Perfil
              </span>
            </>
          )}
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
          {({ isActive }) => (
            <>
              <span className="tab-icon-wrapper" aria-hidden="true">
                <Home size={22} />
              </span>
              <span className="tab-label" aria-current={isActive ? 'page' : undefined}>
                Início
              </span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Perfil"
        >
          {({ isActive }) => (
            <>
              <span className="tab-icon-wrapper" aria-hidden="true">
                <User size={22} />
              </span>
              <span className="tab-label" aria-current={isActive ? 'page' : undefined}>
                Perfil
              </span>
            </>
          )}
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
          aria-label="Painel administrativo"
        >
          {({ isActive }) => (
            <>
              <span className="tab-icon-wrapper" aria-hidden="true">
                <ShieldCheck size={22} />
              </span>
              <span className="tab-label" aria-current={isActive ? 'page' : undefined}>
                Admin
              </span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
          aria-label="Perfil"
        >
          {({ isActive }) => (
            <>
              <span className="tab-icon-wrapper" aria-hidden="true">
                <User size={22} />
              </span>
              <span className="tab-label" aria-current={isActive ? 'page' : undefined}>
                Perfil
              </span>
            </>
          )}
        </NavLink>
      </nav>
    );
  }

  return null;
};

export default BottomTabBar;
