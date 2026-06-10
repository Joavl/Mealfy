import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  UserCheck,
  Heart,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AdminSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, setCollapsed }) => {
  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="admin-sidebar-header">
        <div className="admin-sidebar-logo">
          <Heart size={24} fill="#0d6e6e" color="#0d6e6e" />
          {!collapsed && <span>Mealfy Admin</span>}
        </div>
      </div>

      <nav className="admin-sidebar-menu">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) => `admin-sidebar-item${isActive ? ' active' : ''}`}
          title="Dashboard"
        >
          <LayoutDashboard size={18} />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        <NavLink
          to="/admin/indications"
          className={({ isActive }) => `admin-sidebar-item${isActive ? ' active' : ''}`}
          title="Indicações"
        >
          <FileText size={18} />
          {!collapsed && <span>Indicações</span>}
        </NavLink>

        <NavLink
          to="/admin/families"
          className={({ isActive }) => `admin-sidebar-item${isActive ? ' active' : ''}`}
          title="Famílias"
        >
          <Users size={18} />
          {!collapsed && <span>Famílias</span>}
        </NavLink>

        <NavLink
          to="/admin/entities"
          className={({ isActive }) => `admin-sidebar-item${isActive ? ' active' : ''}`}
          title="Entidades"
        >
          <Building2 size={18} />
          {!collapsed && <span>Entidades</span>}
        </NavLink>

        <NavLink
          to="/admin/users"
          className={({ isActive }) => `admin-sidebar-item${isActive ? ' active' : ''}`}
          title="Usuários"
        >
          <UserCheck size={18} />
          {!collapsed && <span>Usuários</span>}
        </NavLink>

        <NavLink
          to="/admin/donations"
          className={({ isActive }) => `admin-sidebar-item${isActive ? ' active' : ''}`}
          title="Doações"
        >
          <Heart size={18} />
          {!collapsed && <span>Doações</span>}
        </NavLink>

        <NavLink
          to="/admin/audit-logs"
          className={({ isActive }) => `admin-sidebar-item${isActive ? ' active' : ''}`}
          title="Logs de Auditoria"
        >
          <ShieldCheck size={18} />
          {!collapsed && <span>Auditoria</span>}
        </NavLink>
      </nav>

      <div className="admin-sidebar-footer">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="admin-sidebar-toggle-btn"
          aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
