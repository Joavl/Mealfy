import React, { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import AdminHeader from '../components/AdminHeader';
import AdminBreadcrumbs from '../components/AdminBreadcrumbs';
import '../styles/admin.css';

interface AdminLayoutProps {
  title: string;
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ title, children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="admin-body">
      <div className="admin-layout">
        <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        
        <div className="admin-main-container">
          <AdminHeader title={title} />
          
          <main className="admin-content-area">
            <AdminBreadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
