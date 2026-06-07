import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { Heart, Layers, MapPin } from 'lucide-react';
import './Feed.css';

/**
 * Feed — Página Alimentar (Fase 2: placeholder funcional)
 *
 * Esta página é a nova `/feed` (aba Alimentar).
 * Também recebe redirects vindos de `/donate` com estado de família/lote
 * e os encaminha para o fluxo de checkout correto.
 *
 * A implementação completa dos dois modos (família + escala) será feita na Fase 4.
 */
const Feed: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCommunity } = useAppContext();

  // Se chegou com estado de família ou lote (redirect de /donate),
  // encaminha direto para o checkout sem mostrar o seletor de modo.
  useEffect(() => {
    const hasTargetFamily = Boolean(location.state?.targetFamily);
    const hasBatch = Boolean(location.state?.selectedFamilyIds?.length);

    if (hasTargetFamily || hasBatch) {
      navigate('/donate-confirm', {
        state: location.state,
        replace: true,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFamilyMode = () => {
    if (selectedCommunity) {
      navigate('/donate-confirm');
    } else {
      // Se não tem comunidade selecionada, leva ao mapa para escolher
      navigate('/map');
    }
  };

  const handleScaleMode = () => {
    navigate('/big-donation');
  };

  return (
    <div className="feed-page">
      <AppHeader title="Alimentar" />

      <main className="feed-content with-tab-bar">
        {/* Introdução */}
        <section className="feed-intro p-4 pb-0">
          <h1 className="feed-title">Como você quer ajudar?</h1>
          <p className="feed-subtitle">
            Apoie diretamente uma família ou distribua entre várias de uma só vez.
          </p>
        </section>

        {/* Seletor de modo */}
        <section className="feed-modes p-4">
          {/* Modo 1 — Escolher uma família */}
          <button
            className="feed-mode-card"
            onClick={handleFamilyMode}
            type="button"
            aria-label="Escolher uma família específica"
          >
            <div className="feed-mode-icon feed-mode-icon--primary">
              <Heart size={26} />
            </div>
            <div className="feed-mode-text">
              <h3 className="feed-mode-title">Escolher uma família</h3>
              <p className="feed-mode-desc">
                Veja famílias cadastradas e apoie quem você quiser diretamente.
              </p>
            </div>
            <div className="feed-mode-arrow" aria-hidden="true">›</div>
          </button>

          {/* Modo 2 — Alimentar em escala */}
          <button
            className="feed-mode-card"
            onClick={handleScaleMode}
            type="button"
            aria-label="Alimentar várias famílias em escala"
          >
            <div className="feed-mode-icon feed-mode-icon--secondary">
              <Layers size={26} />
            </div>
            <div className="feed-mode-text">
              <h3 className="feed-mode-title">Alimentar em escala</h3>
              <p className="feed-mode-desc">
                Distribua apoio entre várias famílias da região de uma só vez.
              </p>
            </div>
            <div className="feed-mode-arrow" aria-hidden="true">›</div>
          </button>
        </section>

        {/* Acesso rápido ao mapa */}
        <section className="feed-map-access p-4 pt-0">
          <Button
            variant="outline"
            fullWidth
            icon={<MapPin size={18} />}
            onClick={() => navigate('/map')}
          >
            Ver famílias no mapa
          </Button>
        </section>

        {/* Nota informativa */}
        <section className="feed-info-note p-4 mx-4 mb-4">
          <p className="feed-info-text">
            Sua contribuição é convertida em crédito iFood — a família escolhe
            a refeição pelo app com rapidez e segurança.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Feed;
