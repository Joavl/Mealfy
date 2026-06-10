import React from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'info';
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon, variant = 'primary' }) => {
  return (
    <div className="admin-kpi-card">
      <div className="admin-kpi-info">
        <span className="admin-kpi-label">{label}</span>
        <span className="admin-kpi-value">{value}</span>
      </div>
      <div className={`admin-kpi-icon-wrapper ${variant}`}>
        {icon}
      </div>
    </div>
  );
};

export default KpiCard;
