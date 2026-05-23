import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  if (!render) return null;

  return createPortal(
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
    </div>,
    document.body,
  );
};

export default BottomSheet;
