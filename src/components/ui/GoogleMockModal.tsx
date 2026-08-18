import React from 'react';
import type { User } from '../../backend/types';
import './GoogleMockModal.css';

interface GoogleMockModalProps {
  users: User[];
  onSelect: (user: User) => void;
  onClose: () => void;
}

const GoogleMockModal: React.FC<GoogleMockModalProps> = ({ users, onSelect, onClose }) => {
  const initials = (name: string) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();

  const roleLabel = (role: string) => {
    if (role === 'donor') return 'Doador';
    if (role === 'entity') return 'Entidade';
    if (role === 'beneficiary') return 'Beneficiário';
    return role;
  };

  return (
    <div className="gmock-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Selecionar conta de demonstração">
      <div className="gmock-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Handle */}
        <div className="gmock-handle" />

        {/* Header */}
        <div className="gmock-header">
          <div className="gmock-google-logo" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.78h5.4a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.74 3-4.3 3-7.3z" fill="#4285F4"/>
              <path d="M10 20c2.7 0 4.97-.89 6.63-2.42l-3.23-2.5c-.9.6-2.05.96-3.4.96-2.6 0-4.82-1.76-5.6-4.12H1.07v2.58A10 10 0 0 0 10 20z" fill="#34A853"/>
              <path d="M4.4 11.92A5.99 5.99 0 0 1 4.08 10c0-.67.12-1.32.32-1.92V5.5H1.07A10 10 0 0 0 0 10c0 1.61.38 3.14 1.07 4.5l3.33-2.58z" fill="#FBBC04"/>
              <path d="M10 3.96c1.47 0 2.79.51 3.83 1.5l2.86-2.86C14.97.9 12.7 0 10 0A10 10 0 0 0 1.07 5.5l3.33 2.58C5.18 5.72 7.4 3.96 10 3.96z" fill="#EA4335"/>
            </svg>
          </div>
          <div>
            <p className="gmock-title">Selecione uma conta de demonstração</p>
            <p className="gmock-subtitle">Simulação para ambiente de desenvolvimento</p>
          </div>
        </div>

        {/* Accounts list */}
        <ul className="gmock-list" role="listbox">
          {users.map((u) => (
            <li key={u.id}>
              <button
                className="gmock-account-btn"
                onClick={() => onSelect(u)}
                role="option"
                aria-selected="false"
              >
                <div className="gmock-avatar" aria-hidden="true">
                  {u.avatar || initials(u.name)}
                </div>
                <div className="gmock-account-info">
                  <span className="gmock-account-name">{u.name}</span>
                  <span className="gmock-account-email">{u.email}</span>
                </div>
                <span className="gmock-role-badge">{roleLabel(u.role)}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <button className="gmock-cancel-btn" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default GoogleMockModal;
