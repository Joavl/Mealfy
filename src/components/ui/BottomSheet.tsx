import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import './BottomSheet.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  const [render, setRender] = useState(isOpen);
  const pushedHistoryRef = useRef(false);

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  // Makes the system/hardware "back" button close this sheet first,
  // before navigating to the previous page.
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ mealfySheet: true }, '');
    pushedHistoryRef.current = true;

    const handlePopState = () => {
      if (pushedHistoryRef.current) {
        pushedHistoryRef.current = false;
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (pushedHistoryRef.current) {
        pushedHistoryRef.current = false;
        // Só remove a entrada do sheet se ela ainda for o topo do histórico.
        // Se o usuário navegou para outra rota (ex.: "Ver ficha completa"),
        // NÃO chamar back() — isso desfazia a navegação e a tela "não aparecia".
        const state = window.history.state as { mealfySheet?: boolean } | null;
        if (state && state.mealfySheet) {
          window.history.back();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  if (!render) return null;

  return (
    <div className={`bottom-sheet-overlay ${isOpen ? 'open' : 'closed'}`} onClick={onClose} onAnimationEnd={handleAnimationEnd}>
      <div className={`bottom-sheet-content ${isOpen ? 'open' : 'closed'}`} onClick={e => e.stopPropagation()}>
        <div className="bottom-sheet-drag-handle">
          <div className="drag-indicator"></div>
        </div>
        <div className="bottom-sheet-header">
          {title && <h3 className="bottom-sheet-title">{title}</h3>}
          <button className="bottom-sheet-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="bottom-sheet-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BottomSheet;
