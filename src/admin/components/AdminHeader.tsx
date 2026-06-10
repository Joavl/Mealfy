import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminHeaderProps {
  title: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ title }) => {
  const navigate = useNavigate();

  // No modo preview ou integração, limpamos a sessão correspondente
  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const adminName = sessionStorage.getItem('admin_user') || 'Admin Geral';

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <h1 className="admin-header-title">{title}</h1>
      </div>

      <div className="admin-header-right">
        <div className="admin-user-profile">
          <div className="admin-avatar">
            <User size={16} />
          </div>
          <div className="admin-user-info">
            <span className="admin-username">{adminName}</span>
            <span className="admin-user-role">Administrador</span>
          </div>
        </div>

        <button onClick={handleLogout} className="admin-logout-btn">
          <LogOut size={14} />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
