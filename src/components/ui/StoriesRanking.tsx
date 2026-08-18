import React from 'react';
import { User } from 'lucide-react';
import { isImageSrc } from '../../utils/image';
import './StoriesRanking.css';

interface Donor {
  id: string;
  name: string;
  avatar: string;
  totalDonated: number;
  instagram?: string;
  personalMessage?: string;
  supportsCount?: number;
  focusRegion?: string;
  isAnonymous?: boolean;
  privacySettings?: {
    showOnRanking?: boolean;
    showInstagram?: boolean;
    anonymousMode?: boolean;
  };
}

interface SelfUser {
  name: string;
  avatar?: string;
  instagram?: string;
}

interface StoriesRankingProps {
  donors: Donor[];
  onSelectDonor?: (donor: Donor) => void;
  /** Usuário logado — sempre exibido como primeira entrada do carrossel. */
  currentUser?: SelfUser | null;
  /** Acionado ao tocar na entrada do usuário quando não há Instagram conectado. */
  onConnectInstagram?: () => void;
}

const StoriesRanking: React.FC<StoriesRankingProps> = ({ donors, onSelectDonor, currentUser, onConnectInstagram }) => {
  const hasInstagram = !!currentUser?.instagram;
  return (
    <div className="stories-ranking-container">
      <div className="stories-scroll">
        {/* ── Primeira entrada: o próprio usuário ── */}
        {currentUser && (
          <div
            className="story-item story-item--self"
            onClick={() => (hasInstagram ? onSelectDonor?.({ id: 'self', name: currentUser.name, avatar: currentUser.avatar || '', totalDonated: 0 } as Donor) : onConnectInstagram?.())}
            title={hasInstagram ? currentUser.instagram : 'Conecte seu Instagram'}
          >
            <div className="story-avatar-ring self-ring">
              <div className="story-avatar">
                {isImageSrc(currentUser.avatar) ? (
                  <img src={currentUser.avatar} alt={currentUser.name} />
                ) : (
                  currentUser.name?.[0]?.toUpperCase() || 'V'
                )}
              </div>
              {!hasInstagram && <span className="self-add-badge" aria-hidden="true">+</span>}
            </div>
            <span className="story-name story-name--self">Você</span>
          </div>
        )}

        {donors.map((donor) => {
          const isAnon = donor.isAnonymous || donor.privacySettings?.anonymousMode;
          const displayName = isAnon ? 'Anônimo' : donor.name;

          return (
            <div
              key={donor.id}
              className="story-item"
              onClick={() => onSelectDonor?.(donor)}
            >
              <div className={`story-avatar-ring ${donor.totalDonated > 100 ? 'top-tier' : ''}`}>
                <div className="story-avatar">
                  {isAnon ? (
                    <User size={30} className="text-outline/40" />
                  ) : isImageSrc(donor.avatar) ? (
                    <img src={donor.avatar} alt={donor.name} />
                  ) : (
                    donor.avatar || donor.name[0]
                  )}
                </div>
              </div>
              <span className="story-name">{displayName}</span>
            </div>
          );
        })}
        {/* Posição 21+ Sorteio */}
        <div
          className="story-item"
          onClick={() => onSelectDonor?.({ id: 'sorteio', name: 'Sorteio Destaque', totalDonated: 0, isSorteio: true } as any)}
        >
          <div className="story-avatar-ring special-tier">
            <div className="story-avatar bg-secondary text-primary font-bold text-xs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              21+
            </div>
          </div>
          <span className="story-name" style={{ color: 'var(--color-secondary)' }}>Sorteio 21+</span>
        </div>
      </div>
    </div>
  );
};

export default StoriesRanking;
