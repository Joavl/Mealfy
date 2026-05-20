import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import CommunitySelectorModal from '../components/modals/CommunitySelectorModal';
import IfoodGiftFlowCard from '../components/donation/IfoodGiftFlowCard';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { donationService } from '../backend/services/donationService';
import { IFOOD_AMOUNT_TIERS } from '../lib/ifoodGift';
import { MapPin, Info, Loader2 } from 'lucide-react';
import './DonationChoice.css';

const DonationChoice: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCommunity, user } = useAppContext();
  const { showToast } = useToast();
  
  const targetFamily = location.state?.targetFamily as any; 
  const selectedFamilyIds = location.state?.selectedFamilyIds as string[] | undefined;
  
  const isBatch = !!selectedFamilyIds && selectedFamilyIds.length > 0;
  const count = isBatch ? selectedFamilyIds!.length : 1;

  const [selectedAmount, setSelectedAmount] = useState<number | null>(
    count === 1 ? 30 : (count === 2 ? 40 : 50)
  );
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!selectedCommunity) return null;

  const amounts = IFOOD_AMOUNT_TIERS.map((tier) => ({
    value: tier.value,
    impact: tier.impact,
  }));

  const handleContinue = async () => {
    if (!selectedAmount) return; 
    
    setIsProcessing(true);
    try {
      let result;
      if (isBatch) {
        const batchResult = await donationService.createBatchDonation({
          familyIds: selectedFamilyIds!,
          amountPerFamily: Math.floor(selectedAmount / count),
          donorId: user?.id || `anon-${Date.now()}`,
          communityId: selectedCommunity.id
        });
        result = { 
          donation: batchResult.donations[0], 
          giftCard: batchResult.giftCards[0], 
          familyAssigned: { representativeName: `${count} famílias` } 
        };
      } else {
        result = await donationService.createDonation({
          amount: selectedAmount,
          communityId: selectedCommunity.id,
          donorId: user?.id,
          familyId: targetFamily?.id
        });
      }

      navigate('/success', { state: { donationResult: result, isBatch, count } });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao enviar crédito iFood.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const headerTitle = isBatch ? `Crédito iFood (${count} famílias)` : 'Crédito iFood';

  return (
    <div className="donation-choice-page">
      <AppHeader title={headerTitle} showBack onBack={() => navigate(-1)} />
      
      <main className="content p-4">
        <h1 className="page-title text-primary mb-2">
          {targetFamily ? `Apoiar ${targetFamily.representativeName}` : 'Enviar refeição via iFood'}
        </h1>
        <p className="page-subtitle mb-4">
          {isBatch
            ? `Cada família selecionada receberá um gift card iFood proporcional ao valor total (R$ ${selectedAmount ?? '—'}).`
            : 'Sua contribuição vira crédito no app iFood da família — ela escolhe o pedido, você acompanha o impacto.'}
        </p>

        <IfoodGiftFlowCard />
        
        <section className="region-selector mb-6">
          <div className="region-card">
            <div className="region-icon">
              <MapPin size={20} className="text-secondary" />
            </div>
            <div className="region-info">
              <span className="region-label">Comunidade</span>
              <span className="region-value">
                {targetFamily
                  ? `${selectedCommunity.name} · família definida`
                  : selectedCommunity.name}
              </span>
            </div>
            {!targetFamily && (
              <button 
                className="change-region-btn text-primary"
                onClick={() => setIsCommunityModalOpen(true)}
                disabled={isProcessing}
              >
                Alterar
              </button>
            )}
          </div>
        </section>

        <section className="amounts-section mb-6">
          <h3 className="section-subtitle">Valor do crédito iFood</h3>
          <div className="amount-cards-grid">
            {amounts.map((item) => (
              <div 
                key={item.value}
                className={`amount-card ${selectedAmount === item.value ? 'selected' : ''} ${isProcessing ? 'disabled' : ''}`}
                onClick={() => { if(!isProcessing) setSelectedAmount(item.value) }}
              >
                <div className="amount-value">R$ {item.value}</div>
                <div className="amount-impact">{item.impact}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="recurrence-section mb-6">
          <h3 className="section-subtitle">Frequência</h3>
          <div className="recurrence-toggle">
            <button 
              className={`toggle-btn ${!isRecurrent ? 'active' : ''}`}
              onClick={() => { if(!isProcessing) setIsRecurrent(false) }}
            >
              Única
            </button>
            <button 
              className={`toggle-btn ${isRecurrent ? 'active' : ''}`}
              onClick={() => { if(!isProcessing) setIsRecurrent(true) }}
            >
              Mensal
            </button>
          </div>
          {isRecurrent && (
            <div className="recurrence-info mt-4 flex items-center gap-2 text-outline">
              <Info size={16} />
              <span style={{ fontSize: '0.8rem' }}>
                Todo mês geramos novos créditos iFood para manter as famílias da região alimentadas.
              </span>
            </div>
          )}
        </section>
      </main>

      <div className="fixed-bottom-action">
        <Button 
          size="large" 
          fullWidth 
          onClick={handleContinue}
          className="shadow-glow"
          disabled={!selectedAmount || isProcessing}
          icon={isProcessing ? <Loader2 className="animate-spin" size={20} /> : undefined}
        >
          {isProcessing
            ? 'Gerando gift iFood...'
            : selectedAmount
              ? `Enviar R$ ${selectedAmount} via iFood`
              : 'Escolha um valor'}
        </Button>
      </div>

      <CommunitySelectorModal 
        isOpen={isCommunityModalOpen} 
        onClose={() => setIsCommunityModalOpen(false)} 
      />
    </div>
  );
};

export default DonationChoice;
