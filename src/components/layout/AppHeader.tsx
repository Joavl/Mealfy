import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MealfyLogo } from '../ui/MealfyLogo';
import './AppHeader.css';
import '../ui/MealfyLogo.css';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  title, 
  showBack = false, 
  onBack,
  rightAction,
  transparent = false
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={`app-header ${transparent ? 'transparent' : ''}`}>
      <div className="header-left">
        {showBack && (
          <button className="back-btn" onClick={handleBack} aria-label="Voltar">
            <ChevronLeft size={24} />
          </button>
        )}
      </div>
      <div className="header-center">
        {title ? (
          <h1 className="header-title">{title}</h1>
        ) : (
          <MealfyLogo size="sm" />
        )}
      </div>
      <div className="header-right">
        {rightAction}
      </div>
    </header>
  );
};

export default AppHeader;
