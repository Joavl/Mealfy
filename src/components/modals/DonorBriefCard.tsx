import React from 'react';
import BottomSheet from '../ui/BottomSheet';
import Button from '../ui/Button';
import { Heart, Trophy, User } from 'lucide-react';
import { socialService } from '../../backend/services/socialService';
import './DonorBriefCard.css';

export interface CarouselDonorView {
  id: string;
  name: string;
  avatar?: string;
  totalDonated: number;
  instagram?: string;
  facebook?: string;
  isAnonymous?: boolean;
  privacySettings?: {
    showOnRanking: boolean;
    showInstagram: boolean;
    anonymousMode: boolean;
  };
}

interface DonorBriefCardProps {
  donor: CarouselDonorView | null;
  onClose: () => void;
}

const DonorBriefCard: React.FC<DonorBriefCardProps> = ({ donor, onClose }) => {
  const isAnon = donor?.isAnonymous || donor?.privacySettings?.anonymousMode;
  const displayName = isAnon ? 'Doador anônimo' : donor?.name ?? '';
  const showSocial = !isAnon && (donor?.facebook || donor?.instagram);

  return (
    <BottomSheet isOpen={Boolean(donor)} onClose={onClose} title="Doador em destaque">
      {donor && (
        <div className="donor-brief-card">
          <div className="donor-brief-hero">
            <div className={`donor-brief-avatar ${donor.totalDonated > 5000 ? 'top-tier' : ''}`}>
              {isAnon ? (
                <User size={36} className="text-outline/50" />
              ) : (
                donor.avatar || displayName.charAt(0)
              )}
            </div>
            <h3 className="donor-brief-name">{displayName}</h3>
            <p className="donor-brief-impact">
              <Trophy size={16} className="text-secondary" />
              R$ {donor.totalDonated.toLocaleString('pt-BR')} em doações na rede
            </p>
          </div>

          <p className="donor-brief-desc text-sm text-outline leading-relaxed">
            {isAnon
              ? 'Este doador optou por permanecer anônimo no ranking, mas faz parte dos apoiadores que mantêm famílias alimentadas.'
              : `${displayName} está em destaque no carrossel por apoiar famílias da região com crédito iFood.`}
          </p>

          {showSocial && (
            <Button
              variant="outline"
              fullWidth
              className="mb-3"
              onClick={() => void socialService.openDonorFacebook(donor)}
            >
              Ver perfil social
            </Button>
          )}

          <Button variant="secondary" fullWidth size="large" icon={<Heart size={18} />} onClick={onClose}>
            Fechar
          </Button>
        </div>
      )}
    </BottomSheet>
  );
};

export default DonorBriefCard;
