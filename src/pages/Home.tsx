import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { familyService } from '../backend/services/familyService';
import type { Family } from '../backend/types';
import { Loader as Loader2, Share2, AtSign, Copy, MessageCircle, Mail } from 'lucide-react';
import StoriesRanking from '../components/ui/StoriesRanking';
import FaithCarousel from '../components/ui/FaithCarousel';
import InstagramSection from '../components/ui/InstagramSection';
import BottomSheet from '../components/ui/BottomSheet';
import { useToast } from '../context/ToastContext';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRegion, stories, user, updateUserProfile } = useAppContext();
  const { showToast } = useToast();
  const [families, setFamilies] = useState<Family[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  
  // Modals state
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Platform Support
  const [supportAmountText, setSupportAmountText] = useState('');
  const [isSupporting, setIsSupporting] = useState(false);

  useEffect(() => {
    setLoadingFamilies(true);
    const filters = selectedRegion ? { region: selectedRegion } : undefined;
    familyService.getFamilies(filters).then(res => {
      setFamilies(res);
      setLoadingFamilies(false);
    });
  }, [selectedRegion]);

  const familiesHelped = families.filter(f => f.supportStatus === 'supported' || f.supportStatus === 'fed').length;
  const familiesNeedsHelp = families.filter(f => f.supportStatus === 'needs_help').length;

  // Dynamic regional feeding text (2-3 variations based on selection)
  const getDynamicFeedingText = () => {
    if (!selectedRegion) {
      return 'Sua ajuda se transforma rapidamente em refeições quentes e segurança alimentar para crianças vulneráveis.';
    }
    const region = selectedRegion.toLowerCase();
    if (region.includes('heliópolis')) {
      return 'Sua contribuição para Heliópolis se transforma em refeições quentes e cestas básicas entregues no mesmo dia.';
    }
    if (region.includes('paraisópolis')) {
      return 'Seu apoio para Paraisópolis fortalece a cozinha comunitária e garante merendas nutritivas.';
    }
    if (region.includes('tiradentes')) {
      return 'Sua ação em Cidade Tiradentes blinda as crianças do bairro contra a insegurança alimentar.';
    }
    return `Sua contribuição para ${selectedRegion} garante alimentação de qualidade para famílias atendidas localmente.`;
  };

  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText('https://mealfy.com');
    showToast('Link de compartilhamento copiado!', 'success');
    setIsShareModalOpen(false);
  };

  const simulatePlatformSupport = () => {
    const amt = parseFloat(supportAmountText);
    if (isNaN(amt) || amt <= 0) {
      showToast('Por favor, informe um valor válido para apoiar.', 'error');
      return;
    }
    setIsSupporting(true);
    setTimeout(() => {
      setIsSupporting(false);
      setIsSupportOpen(false);
      showToast(`Obrigado por apoiar a plataforma com R$ ${amt.toFixed(2)}!`, 'success');
      setSupportAmountText('');
    }, 1500);
  };

  const handleConnectInstagram = async () => {
    if (!user) return;
    const handle = '@' + (user.name || 'usuario').toLowerCase().trim().replace(/\s+/g, '.').replace(/[^a-z0-9._]/g, '');
    await updateUserProfile({ instagram: handle });
    showToast('Instagram conectado ao seu perfil! Você ganha mais destaque na comunidade.', 'success');
  };

  const handleSelectDonor = (donor: any) => {
    if (donor.isSorteio) {
      showToast('Sorteio 21+: Qualquer pessoa que apoiar hoje tem a chance de aparecer no topo do carrossel de impacto!', 'info');
      return;
    }
    navigate(`/profile/${donor.id}`);
  };

  return (
    <div className="home-page">
      {/* ── Top Header Brand (logo + wordmark centralizados) ── */}
      <div className="home-top">
        <header className="home-brand-row">
          <div className="home-brand-spacer" aria-hidden="true" />
          <div className="home-brand-lockup">
            <span className="home-brand">Mealfy</span>
          </div>
          <button
            className="home-share-btn"
            onClick={handleShareClick}
            aria-label="Compartilhar"
          >
            <Share2 size={18} />
          </button>
        </header>

        {/* Stories Ranking Component */}
        <StoriesRanking
          donors={stories}
          onSelectDonor={handleSelectDonor}
          currentUser={user ? { name: user.name, avatar: user.avatar, instagram: user.instagram } : null}
          onConnectInstagram={handleConnectInstagram}
        />

        {/* Carrossel de mensagem religiosa logo abaixo dos stories */}
        <FaithCarousel />
      </div>

      {/* ── Hero Headline ── */}
      <div className="hero-section">
        <div className="hero-image-overlay"></div>
        <img
          src="/images/home-hero.jpg"
          alt="Pai e filha abraçados em sua comunidade"
          className="hero-image"
          loading="eager"
          onError={(e) => {
            const t = e.currentTarget;
            if (!t.dataset.fallback) {
              t.dataset.fallback = '1';
              t.src = 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
            }
          }}
        />
        <div className="hero-content">
          <h1 className="hero-headline">Alimente uma criança.<br/>Combata a fome.</h1>
          <p className="hero-subtext">
            {getDynamicFeedingText()}
          </p>
          
          <div className="hero-actions">
            <Button 
              size="large" 
              fullWidth 
              onClick={() => navigate('/donate')}
              className="cta-donate shadow-glow"
            >
              Alimente uma criança
            </Button>
            <Button 
              variant="outline" 
              size="large" 
              fullWidth
              onClick={() => navigate('/map')}
              className="cta-secondary text-inverted border-inverted"
            >
              Explorar mapa regional
            </Button>
          </div>
        </div>
      </div>

      {/* ── Impact Statistics ── */}
      <div className="social-proof-section p-4">
        <h2 className="section-title text-center mb-4 text-primary font-bold">
          Impacto em {selectedRegion || 'todas as regiões'}
        </h2>
        
        {loadingFamilies ? (
          <div className="text-center text-outline my-8 flex flex-col items-center gap-2">
             <Loader2 className="animate-spin mx-auto text-primary" size={24} />
             <span className="text-xs">Atualizando dados...</span>
          </div>
        ) : families.length === 0 ? (
          <div className="text-center my-8 p-6 bg-surface-highest rounded-xl border border-outline/10 mx-4">
             <p className="text-sm text-outline italic">Ainda não há famílias cadastradas nesta região.</p>
          </div>
        ) : (
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number text-secondary">4</span>
              <span className="stat-label">Regiões</span>
            </div>
            <div className="stat-card">
              <span className={`stat-number ${familiesNeedsHelp > 0 ? 'text-error' : 'text-success'}`}>
                {familiesNeedsHelp}
              </span>
              <span className="stat-label">Precisam Agora</span>
            </div>
            <div className="stat-card">
              <span className="stat-number text-success">
                {familiesHelped}
              </span>
              <span className="stat-label">Apoiadas</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Impact Quote ── */}
      <div className="surface-card impact-quote-card mx-4 mt-4 mb-6">
        <p className="impact-quote-text">
          Cada prato que chega à mesa de uma criança é uma vitória contra a invisibilidade da fome.
        </p>
        <span className="impact-quote-author">— Mealfy Team</span>
      </div>

      {/* ── Institutional Support ── */}
      <div className="surface-card support-development-section mx-4 my-4">
        <h4 className="font-bold text-primary mb-1">Apoie a plataforma</h4>
        <p className="text-xs text-outline mb-3">
          Ao apoiar a Mealfy, você ajuda a manter a tecnologia ativa e conectar mais crianças e famílias à alimentação.
        </p>

        <div className="py-3 mb-3 border-t border-b border-outline/10">
          <span className="sponsor-eyebrow">Parceiros de tecnologia</span>
          <div className="sponsor-logos">
            {[
              { name: 'Owl4tech', initial: 'O' },
              { name: 'Talon Intelligence', initial: 'T' },
            ].map((s) => (
              <div key={s.name} className="sponsor-chip">
                <span className="sponsor-chip-mark" aria-hidden="true">{s.initial}</span>
                <span className="sponsor-chip-name">{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        <Button variant="outline" size="small" fullWidth onClick={() => setIsSupportOpen(true)}>
          Apoiar Tecnologia
        </Button>
      </div>
      
      <InstagramSection />

      <div className="bottom-spacing"></div>

      {/* ── Platform Support BottomSheet (Free numeric amount) ── */}
      <BottomSheet isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} title="Apoiar Tecnologia">
        <p className="text-sm text-outline mb-4">Seu apoio voluntário ajuda a pagar os servidores e expandir o combate à fome para mais cidades brasileiras.</p>
        
        <div className="form-group mb-6">
          <label className="form-label">Valor do Apoio (R$)</label>
          <input 
            type="number" 
            className="form-input" 
            placeholder="Ex: R$ 50"
            value={supportAmountText}
            onChange={(e) => setSupportAmountText(e.target.value)}
            min="1"
          />
        </div>

        <Button 
          variant="primary" 
          fullWidth 
          size="large"
          disabled={!supportAmountText || isSupporting}
          loading={isSupporting}
          onClick={simulatePlatformSupport}
        >
          {isSupporting ? 'Processando...' : 'Confirmar Apoio à Plataforma'}
        </Button>
      </BottomSheet>

      {/* ── Custom Share Modal ── */}
      <BottomSheet isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Compartilhar Mealfy">
        <p className="text-sm text-outline mb-6">Espalhe essa causa e ajude a engajar mais pessoas na luta contra a fome infantil.</p>
        
        <div className="flex flex-col gap-3">
          <button 
            className="flex items-center gap-3 p-4 bg-surface rounded-md border border-outline/10 text-left hover:bg-surface-highest transition-all"
            onClick={() => { showToast('Simulando envio pelo WhatsApp...', 'info'); setIsShareModalOpen(false); }}
          >
            <MessageCircle size={20} className="text-success" />
            <span className="font-semibold text-sm">Enviar por WhatsApp</span>
          </button>
          
          <button 
            className="flex items-center gap-3 p-4 bg-surface rounded-md border border-outline/10 text-left hover:bg-surface-highest transition-all"
            onClick={() => { showToast('Simulando abertura do Instagram Stories...', 'info'); setIsShareModalOpen(false); }}
          >
            <AtSign size={20} className="text-secondary" />
            <span className="font-semibold text-sm">Compartilhar no Instagram Stories</span>
          </button>
          
          <button 
            className="flex items-center gap-3 p-4 bg-surface rounded-md border border-outline/10 text-left hover:bg-surface-highest transition-all"
            onClick={() => { showToast('Simulando envio por E-mail...', 'info'); setIsShareModalOpen(false); }}
          >
            <Mail size={20} className="text-primary" />
            <span className="font-semibold text-sm">Enviar por E-mail</span>
          </button>

          <button 
            className="flex items-center gap-3 p-4 bg-surface rounded-md border border-outline/10 text-left hover:bg-surface-highest transition-all"
            onClick={copyShareLink}
          >
            <Copy size={20} className="text-outline" />
            <span className="font-semibold text-sm">Copiar Link do Aplicativo</span>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default Home;
