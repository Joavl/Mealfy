import React, { useEffect, useState } from 'react';
import { MealfyLogo } from './MealfyLogo';
import './SplashScreen.css';
import './MealfyLogo.css';

const SplashScreen: React.FC = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <MealfyLogo size="xl" className="splash-logo-img" />
        <p className="splash-text text-primary">Preparando sua experiência{dots}</p>
      </div>
    </div>
  );
};

export default SplashScreen;
