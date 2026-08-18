import React from 'react';
import { Check } from 'lucide-react';
import './GiftCardSelectorModal.css';

export interface GiftCardPartner {
  id: string;
  name: string;
  color: string;
  description: string;
}

export const GIFT_CARD_PARTNERS: GiftCardPartner[] = [
  { id: 'ifood',     name: 'iFood',     color: '#EA1D2C', description: 'Resgate em qualquer loja iFood Mercado.' },
  { id: 'carrefour', name: 'Carrefour', color: '#1E4DA1', description: 'Use em qualquer unidade Carrefour ou Carrefour Express.' },
  { id: '99',        name: '99 Mercado', color: '#FFCC00', description: 'Pague com saldo 99Pay em restaurantes e mercados parceiros.' },
];

interface GiftCardSelectorModalProps {
  selected: string;
  onConfirm: (providerId: string) => void;
  onClose: () => void;
}

const GiftCardSelectorModal: React.FC<GiftCardSelectorModalProps> = ({ selected, onConfirm, onClose }) => {
  const [choice, setChoice] = React.useState(selected);

  return (
    <div className="gmock-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Escolher seu vale-alimentação">
      <div className="gmock-sheet giftcard-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="gmock-handle" />

        <div className="giftcard-header">
          <p className="gmock-title">Escolher seu vale-alimentação</p>
          <p className="gmock-subtitle giftcard-subtitle">Selecione o parceiro para resgate do seu benefício</p>
        </div>

        <div className="giftcard-list">
          {GIFT_CARD_PARTNERS.map((p) => (
            <button
              key={p.id}
              className={`giftcard-option ${choice === p.id ? 'selected' : ''}`}
              onClick={() => setChoice(p.id)}
            >
              <div className="giftcard-logo" style={{ background: p.color }} aria-hidden="true">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="giftcard-option-text">
                <span className="giftcard-option-name">{p.name}</span>
                <span className="giftcard-option-desc">{p.description}</span>
              </div>
              {choice === p.id && (
                <span className="giftcard-check" aria-hidden="true">
                  <Check size={16} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>

        <button className="giftcard-confirm-btn" onClick={() => onConfirm(choice)}>
          Confirmar escolha
        </button>
        <button className="gmock-cancel-btn" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default GiftCardSelectorModal;
