import { useState, useEffect, useRef } from 'react';

export type InitializationStatus = 'initializing' | 'ready' | 'exiting' | 'complete';

export function useAppInitialization() {
  const [status, setStatus] = useState<InitializationStatus>('initializing');
  const [isAppReady, setIsAppReady] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const initializeApp = async () => {
      try {
        // 1. Carregamento real dos dados (futuro backend):
        // Neste momento, as chamadas assíncronas reais seriam executadas aqui:
        // await Promise.all([
        //   authService.getCurrentSession(),
        //   communityService.getCommunities(),
        // ]);
        
        // Indicamos que a aplicação já pode ser montada/renderizada no plano de fundo
        setIsAppReady(true);

        // 2. Tempo mínimo de exibição simulado (2,4 segundos para sincronia perfeita)
        await delay(2400);
        
        // 3. Tempo mínimo concluído, prepara início da transição de saída
        setStatus('ready');
      } catch (error) {
        console.error('App initialization failed:', error);
        setIsAppReady(true);
        setStatus('ready'); // Fallback para evitar travamento da aplicação
      }
    };

    initializeApp();
  }, []);

  const isInitializing = status === 'initializing';
  const initializationComplete = status === 'complete';

  return {
    status,
    setStatus,
    isInitializing,
    isAppReady,
    initializationComplete,
  };
}
