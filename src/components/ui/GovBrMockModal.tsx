import React from 'react';
import { ShieldCheck } from 'lucide-react';
import './GovBrMockModal.css';

export interface GovBrMockData {
  name: string;
  birthDate: string;
  cpf: string;
}

interface GovBrMockModalProps {
  data: GovBrMockData;
  onConfirm: () => void;
  onClose: () => void;
}

const GovBrMockModal: React.FC<GovBrMockModalProps> = ({ data, onConfirm, onClose }) => {
  return (
    <div className="gmock-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Identidade verificada via Gov.br">
      <div className="gmock-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Handle */}
        <div className="gmock-handle" />

        {/* Header */}
        <div className="gmock-header">
          <div className="govbr-logo" aria-hidden="true">
            <ShieldCheck size={22} color="#FFCD07" strokeWidth={2.5} />
          </div>
          <div>
            <p className="gmock-title">Identidade verificada via Gov.br</p>
            <p className="gmock-subtitle govbr-subtitle">Simulação — nenhum dado real foi consultado</p>
          </div>
        </div>

        {/* Auto-filled data summary */}
        <div className="govbr-data-summary">
          <p className="govbr-data-title">Dados preenchidos automaticamente</p>
          <div className="govbr-data-row">
            <span className="govbr-data-label">Nome completo</span>
            <span className="govbr-data-value">{data.name}</span>
          </div>
          <div className="govbr-data-row">
            <span className="govbr-data-label">Data de nascimento</span>
            <span className="govbr-data-value">{data.birthDate}</span>
          </div>
          <div className="govbr-data-row">
            <span className="govbr-data-label">CPF</span>
            <span className="govbr-data-value">{data.cpf}</span>
          </div>
        </div>

        {/* Footer */}
        <button className="govbr-confirm-btn" onClick={onConfirm}>
          Confirmar e continuar
        </button>
        <button className="gmock-cancel-btn" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default GovBrMockModal;
