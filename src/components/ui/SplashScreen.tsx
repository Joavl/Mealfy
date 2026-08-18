import React, { useEffect, useState } from 'react';
import meaflLogo from '../../assets/mealfy-logo.png';
import './SplashScreen.css';

interface SplashScreenProps {
  isLoaded?: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isLoaded = false }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setProgress(100);
      const timer = setTimeout(() => setExiting(true), 250);
      return () => clearTimeout(timer);
    }

    const step = () => {
      setProgress(prev => {
        if (prev >= 88) return prev;
        const increment = prev < 40 ? 3 : prev < 70 ? 1.5 : 0.5;
        return Math.min(prev + increment, 88);
      });
    };

    const timer = setInterval(step, 80);
    return () => clearInterval(timer);
  }, [isLoaded]);

  return (
    <div
      className={`splash-screen ${visible ? 'splash-visible' : ''} ${exiting ? 'splash-exiting' : ''}`}
      role="status"
      aria-label="Carregando Mealfy"
    >
      <div className="splash-content">
        {/* Logo image */}
        <div className="splash-logo-wrapper">
          <img
            src={meaflLogo}
            alt="Mealfy"
            className="splash-logo-img"
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="splash-progress-container">
        <div className="splash-progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export default SplashScreen;
