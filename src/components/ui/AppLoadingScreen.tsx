import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MealfyLogo } from './MealfyLogo';
import './AppLoadingScreen.css';

type VisualState = 'initial' | 'entering' | 'visible' | 'exiting' | 'hidden';

interface AppLoadingScreenProps {
  status: 'initializing' | 'ready' | 'exiting' | 'complete';
  onExitComplete: () => void;
  setStatus: (status: 'initializing' | 'ready' | 'exiting' | 'complete') => void;
}

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  status,
  onExitComplete,
  setStatus,
}) => {
  const [visualState, setVisualState] = useState<VisualState>('initial');
  const containerRef = useRef<HTMLDivElement>(null);
  const firstFrameRef = useRef<number>(0);
  const secondFrameRef = useRef<number>(0);
  const exitTriggered = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Garante que o navegador renderize o estado inicial 'initial' antes de iniciar a transição de entrada
  useEffect(() => {
    const firstFrame = requestAnimationFrame(() => {
      const secondFrame = requestAnimationFrame(() => {
        setVisualState('entering');
      });
      secondFrameRef.current = secondFrame;
    });
    firstFrameRef.current = firstFrame;

    return () => {
      cancelAnimationFrame(firstFrameRef.current);
      cancelAnimationFrame(secondFrameRef.current);
    };
  }, []);

  // Quando o status do hook principal for 'ready', inicia a animação de saída
  useEffect(() => {
    if (status === 'ready' && !exitTriggered.current) {
      exitTriggered.current = true;
      setVisualState('exiting');
      setStatus('exiting');
    }
  }, [status, setStatus]);

  const triggerComplete = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Remove a classe de inicialização do body
    document.body.classList.remove('app-initializing');
    setVisualState('hidden');
    onExitComplete();
  }, [onExitComplete]);

  // Callback acionado no final das transições CSS (transform ou opacity)
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== containerRef.current) return;

    if (e.propertyName === 'transform' || e.propertyName === 'opacity') {
      if (visualState === 'entering') {
        setVisualState('visible');
      } else if (visualState === 'exiting') {
        triggerComplete();
      }
    }
  };

  // Timeout de segurança caso o evento transitionend falhe ou reduzida movimentação esteja ativa
  useEffect(() => {
    if (visualState === 'exiting') {
      // Duração da saída da camada: 700ms + 100ms de delay + 150ms margem de segurança
      timeoutRef.current = setTimeout(() => {
        triggerComplete();
      }, 950);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visualState, triggerComplete]);

  if (visualState === 'hidden') return null;

  const containerClass = `app-loading-screen ${visualState}`;

  return (
    <div
      ref={containerRef}
      className={containerClass}
      onTransitionEnd={handleTransitionEnd}
      role="status"
      aria-busy={visualState !== 'exiting' ? 'true' : 'false'}
      aria-live="polite"
      aria-modal="true"
      aria-label="Carregando aplicativo"
    >
      <div className="loading-content">
        <div className="logo-wrapper">
          <MealfyLogo size="xl" className="loading-logo" />
        </div>
        
        {visualState !== 'exiting' && (
          <div className="indicator-wrapper">
            <p className="loading-text">
              Preparando sua experiência
              <span className="dots-container">
                <span className="dot">.</span>
                <span className="dot">.</span>
                <span className="dot">.</span>
              </span>
            </p>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
