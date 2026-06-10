import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  converted: 'Convertido',
  suspended: 'Suspenso',
  active: 'Ativo',
  needs_help: 'Precisa de Ajuda',
  supported: 'Apoiado',
  fed: 'Alimentado',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toLowerCase();
  const label = statusLabels[normalized] || status;

  return (
    <span className={`admin-badge ${normalized}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
