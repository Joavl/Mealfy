import React from 'react';
import BottomSheet from '../ui/BottomSheet';
import Button from '../ui/Button';
import { Trophy, TrendingUp, Target } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { rankingService } from '../../backend/services/rankingService';
import './RankingDetailsModal.css';

interface RankingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RankingDetailsModal: React.FC<RankingDetailsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAppContext();
  const [rankingInfo, setRankingInfo] = React.useState<any>(null);

  React.useEffect(() => {
    if (user && isOpen) {
       rankingService.getUserRanking(user.id).then(res => setRankingInfo(res));
    }
  }, [user, isOpen]);

  if (!rankingInfo) return null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Meu Ranking">
      <div className="ranking-hero flex-col items-center justify-center p-4 mb-4">
        <div className="ranking-medal mb-3">
          <Trophy size={48} className="text-secondary" />
        </div>
        <h2 className="ranking-position-title text-primary">{rankingInfo.rankingPercentile} dos doadores</h2>
        <p className="ranking-position-subtitle">Você é um {rankingInfo.rankingPercentile === 'Top 1%' ? 'Doador Diamante!' : 'Doador Ouro!'}</p>
      </div>

      <div className="ranking-stats-grid mb-6">
        <div className="ranking-stat-box">
          <span className="stat-icon"><TrendingUp size={18} className="text-primary" /></span>
          <span className="stat-val">#{rankingInfo.rankingPosition}</span>
          <span className="stat-desc">Posição Global</span>
        </div>
        <div className="ranking-stat-box">
          <span className="stat-icon"><Target size={18} className="text-secondary" /></span>
          <span className="stat-val">{rankingInfo.totalDonated * 10}</span>
          <span className="stat-desc">Pontos de Impacto</span>
        </div>
      </div>

      <div className="progress-section mb-6">
        <div className="progress-header flex justify-between mb-2">
          <span className="font-semibold">Progresso de Nível</span>
          <span className="text-secondary font-bold">{rankingInfo.totalDonated * 10} pt</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${Math.min((rankingInfo.totalDonated / 200) * 100, 100)}%` }}></div>
        </div>
      </div>

      <Button fullWidth size="large" onClick={onClose} variant="secondary">
        Continuar impactando
      </Button>
    </BottomSheet>
  );
};

export default RankingDetailsModal;
