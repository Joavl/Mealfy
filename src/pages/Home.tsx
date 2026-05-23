import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { familyService } from '../backend/services/familyService';
import { rankingService } from '../backend/services/rankingService';
import type { Family } from '../backend/types';
import { Trophy, Loader2, Copy, CheckCircle, QrCode } from 'lucide-react';
import StoriesRanking from '../components/ui/StoriesRanking';
import DonorBriefCard, { type CarouselDonorView } from '../components/modals/DonorBriefCard';
import BottomSheet from '../components/ui/BottomSheet';
import ImpactRegionSelector from '../components/modals/ImpactRegionSelector';
import { useToast } from '../context/ToastContext';
import './Home.css';

const FEATURED_UPDATED_EVENT = 'mealfy:featured-donors-updated';

const PIX_COPY_CODE = '00020126360014br.gov.bcb.pix0114664183870001095204000053039865802BR5925OWL4TECH INTELLIGENCE LTD6013FLORIANOPOLIS62070503***6304372E';
const PIX_KEY = '66418387000109';
const PIX_RECEIVER = 'OWL4TECH INTELLIGENCE LTDA';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRegion } = useAppContext();
  const { showToast } = useToast();
  const [families, setFamilies] = useState<Family[]>([]);
  const [topDonors, setTopDonors] = useState<any[]>([]);
  const [selectedDonor, setSelectedDonor] = useState<CarouselDonorView | null>(null);
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [hasCopiedPix, setHasCopiedPix] = useState(false);

  const refreshCarousel = () => {
    rankingService.getTopDonors().then(setTopDonors);
  };

  useEffect(() => {
    refreshCarousel();

    const onFeaturedUpdated = () => refreshCarousel();
    window.addEventListener(FEATURED_UPDATED_EVENT, onFeaturedUpdated);
    return () => window.removeEventListener(FEATURED_UPDATED_EVENT, onFeaturedUpdated);
  }, []);

  useEffect(() => {
    setLoadingFamilies(true);
    const filters = selectedRegion ? { region: selectedRegion } : undefined;
    familyService.getFamilies(filters).then(res => {
      setFamilies(res);
      setLoadingFamilies(false);
    });
  }, [selectedRegion]);

  const familiesHelped = families.filter(f => f.supportStatus === 'supported').length;
  const familiesNeedsHelp = families.filter(f => f.supportStatus === 'needs_help').length;

  const handleCopyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(PIX_COPY_CODE);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = PIX_COPY_CODE;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    setHasCopiedPix(true);
    showToast('Código Pix copiado com sucesso!', 'success');
    window.setTimeout(() => setHasCopiedPix(false), 2200);
  };

  return (
    <div className="home-page">
      <div className="home-top">
        <div className="home-brand-row">
          <div className="home-brand">Mealfy</div>
          <div className="home-top-action flex items-center cursor-pointer" onClick={() => setIsRegionSelectorOpen(true)}>
             <span className="text-xs font-bold mr-2 text-primary">
               {selectedRegion ? `Em: ${selectedRegion}` : 'Escolha onde ajudar'}
             </span>
             <Trophy size={20} className="text-secondary" />
          </div>
        </div>

        <div className="home-social-copy">
          <span className="home-eyebrow">Comunidade ativa</span>
          <h2 className="home-social-title">Pessoas movendo impacto hoje</h2>
        </div>

        <StoriesRanking 
          donors={topDonors} 
          onSelectDonor={(d) => setSelectedDonor(d)} 
        />
      </div>

      <div className="hero-section">
        <div className="hero-image-overlay"></div>
        <img 
          src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
          alt="Criança sorrindo" 
          className="hero-image"
        />
        <div className="hero-content">
          <h1 className="hero-headline">Apoie hoje.<br/>Alimente uma criança.</h1>
          <p className="hero-subtext">
            Sua contribuição em {selectedRegion || 'famílias da região'} vira <strong>crédito iFood</strong> — a família escolhe a refeição no app.
          </p>
          
          <div className="hero-actions">
            <Button 
              size="large" 
              fullWidth 
              onClick={() => navigate('/donate')}
              className="cta-donate shadow-glow"
            >
              Enviar crédito iFood
            </Button>
            <Button 
              variant="outline" 
              size="large" 
              fullWidth
              onClick={() => navigate('/explore')}
              className="cta-secondary text-inverted border-inverted"
            >
              Explorar ações na região
            </Button>
          </div>
        </div>
      </div>



      <div className="social-proof-section p-4">
        <h2 className="section-title text-center mb-4 text-primary font-bold">
          Impacto em {selectedRegion || 'todas as regiões'}
        </h2>
        
        {loadingFamilies ? (
          <div className="text-center text-outline my-8 flex-col items-center gap-2">
             <Loader2 className="animate-spin mx-auto text-primary" size={24} />
             <span className="text-xs">Atualizando dados...</span>
          </div>
        ) : families.length === 0 ? (
          <div className="text-center my-8 p-6 bg-surface-highest rounded-2xl border border-outline/10 mx-4">
             <p className="text-sm text-outline italic">Ainda não há famílias cadastradas em {selectedRegion || 'nenhuma região'}.</p>
             <Button variant="ghost" size="small" className="mt-2 text-primary" onClick={() => navigate('/register-family')}>Indique uma família</Button>
          </div>
        ) : (
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number text-secondary">{familiesHelped + familiesNeedsHelp}</span>
              <span className="stat-label">Cadastradas</span>
            </div>
            <div className="stat-card">
              <span className={`stat-number ${familiesNeedsHelp > 0 ? 'text-error' : 'text-success'}`}>
                {familiesNeedsHelp} 
                <span style={{fontSize: '1rem', marginLeft: 4}}>
                  {familiesNeedsHelp > 0 ? '💔' : '💚'}
                </span>
              </span>
              <span className="stat-label">Precisam Agora</span>
            </div>
            <div className="stat-card">
              <span className="stat-number text-success">
                {familiesHelped}
                <span style={{fontSize: '1rem', marginLeft: 4}}>❤️</span>
              </span>
              <span className="stat-label">Apoiadas</span>
            </div>
          </div>
        )}
        <Button 
          variant="outline" 
          fullWidth
          className="mt-4 border-outline text-outline"
          onClick={() => navigate('/map')}
        >
          Visualizar a Fome no Mapa
        </Button>
      </div>

      <div className="home-institutional p-4 text-center">
        <h3 className="text-xs font-bold text-outline/40 uppercase tracking-widest mb-1">Impacted by</h3>
        <div className="flex items-center justify-center gap-2">
          <span className="font-serif text-xl font-black text-primary italic">AWL for Tech</span>
        </div>
      </div>



      <div className="support-development-section p-4 my-4 bg-primary/5 rounded-xl mx-4 border border-primary/10">
        <p className="text-sm italic text-outline mb-3">
          "Cada prato que chega à mesa de uma criança é uma vitória contra a invisibilidade da fome." — Chris
        </p>
        <div className="dev-support-card">
           <h4 className="font-bold text-primary mb-1">Ajude o desenvolvimento</h4>
           <p className="text-xs text-outline mb-3">Apoie o desenvolvimento da plataforma e o marketing para levar alimento a mais famílias.</p>
           <Button variant="outline" size="small" fullWidth onClick={() => setIsSupportOpen(true)}>
             Apoiar Plataforma
           </Button>
        </div>
      </div>
      
      <div className="bottom-spacing"></div>

      <BottomSheet isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} title="Apoiar Plataforma">
        <div className="pix-support-sheet">
          <div className="pix-support-intro">
            <span className="pix-support-icon">
              <QrCode size={20} />
            </span>
            <div>
              <p className="text-sm text-outline mb-1">Seu apoio ajuda a manter o servidor online e a levar a plataforma para mais comunidades pelo Brasil.</p>
              <strong>Pix para {PIX_RECEIVER}</strong>
            </div>
          </div>

          <div className="pix-qr-frame">
            <img src="/pix-qr-code.png" alt="QR Code Pix para apoiar a plataforma Mealfy" className="pix-qr-image" />
          </div>

          <div className="pix-meta-card">
            <div>
              <span>Recebedor</span>
              <strong>{PIX_RECEIVER}</strong>
            </div>
            <div>
              <span>Chave Pix</span>
              <strong>{PIX_KEY}</strong>
            </div>
          </div>

          <div className="pix-copy-card">
            <span>Código Pix copia e cola</span>
            <code>{PIX_COPY_CODE}</code>
          </div>
        </div>

        <Button 
          variant="primary" 
          fullWidth 
          size="large"
          icon={hasCopiedPix ? <CheckCircle size={18} /> : <Copy size={18} />}
          onClick={handleCopyPixCode}
        >
          {hasCopiedPix ? 'Código copiado' : 'Copiar código Pix'}
        </Button>
      </BottomSheet>

      <DonorBriefCard donor={selectedDonor} onClose={() => setSelectedDonor(null)} />

      <ImpactRegionSelector 
        isOpen={isRegionSelectorOpen} 
        onClose={() => setIsRegionSelectorOpen(false)} 
      />
    </div>
  );
};

export default Home;
