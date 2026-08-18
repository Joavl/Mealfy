import React from 'react';
import './InstagramSection.css';

interface IgAccount {
  handle: string;
  url: string;
  label: string;
  bio?: string;
}

const FEATURED: IgAccount = {
  handle: '@mealfyoficial',
  url: 'https://www.instagram.com/mealfyoficial',
  label: 'Mealfy',
  bio: 'Combatendo a fome infantil, uma refeição de cada vez.',
};

const IDEALIZER: IgAccount = {
  handle: '@christianomealfy',
  url: 'https://www.instagram.com/christianomealfy',
  label: 'Idealizador do Mealfy',
};

// A ordem aqui é a ordem na tela, e é intencional: Talon antes de Owl.
const PARTNERS: IgAccount[] = [
  { handle: '@talonintelligence', url: 'https://www.instagram.com/talonintelligence', label: 'Inteligência' },
  { handle: '@owl4tech',          url: 'https://www.instagram.com/owl4tech',          label: 'Tecnologia' },
];

function open(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Ícone do Instagram como SVG inline — sem dependência de rede. */
const IgIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#f09433" />
        <stop offset="25%"  stopColor="#e6683c" />
        <stop offset="50%"  stopColor="#dc2743" />
        <stop offset="75%"  stopColor="#cc2366" />
        <stop offset="100%" stopColor="#bc1888" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)" />
    <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
    <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
  </svg>
);

interface InstagramSectionProps {
  /**
   * Mostra os perfis parceiros. Desligado na tela do beneficiário, que vê
   * apenas o Mealfy e o idealizador — quem está ali esperando uma refeição não
   * é público de divulgação de parceiro.
   */
  showPartners?: boolean;
}

const InstagramSection: React.FC<InstagramSectionProps> = ({ showPartners = true }) => (
  <section className="ig-section mx-4 mb-4">
    <div className="ig-section-header">
      <IgIcon size={16} />
      <span>Conecte-se no Instagram</span>
    </div>

    {/* ── Featured: @mealfyoficial ── */}
    <button className="ig-featured-card" onClick={() => open(FEATURED.url)} aria-label={`Abrir ${FEATURED.handle} no Instagram`}>
      <div className="ig-featured-inner">
        <div className="ig-featured-top">
          <div className="ig-featured-icon">
            <IgIcon size={32} />
          </div>
          <div className="ig-featured-meta">
            <span className="ig-featured-label">{FEATURED.label}</span>
            <span className="ig-featured-handle">{FEATURED.handle}</span>
          </div>
          <span className="ig-follow-badge">Seguir</span>
        </div>
        {FEATURED.bio && <p className="ig-featured-bio">{FEATURED.bio}</p>}
      </div>
    </button>

    {/* ── Idealizador & parceiros — lista uniforme de linhas horizontais ── */}
    <p className="ig-subsection-label">
      {showPartners ? 'Idealizador & Parceiros' : 'Idealizador'}
    </p>

    <div className="ig-accounts-list">
      {(showPartners ? [IDEALIZER, ...PARTNERS] : [IDEALIZER]).map((acc) => (
        <button key={acc.handle} className="ig-account-row" onClick={() => open(acc.url)} aria-label={`Abrir ${acc.handle} no Instagram`}>
          <span className="ig-account-icon"><IgIcon size={22} /></span>
          <span className="ig-account-meta">
            <span className="ig-account-handle">{acc.handle}</span>
            <span className="ig-account-label">{acc.label}</span>
          </span>
          <span className="ig-account-follow">Seguir <span aria-hidden="true">↗</span></span>
        </button>
      ))}
    </div>
  </section>
);

export default InstagramSection;
