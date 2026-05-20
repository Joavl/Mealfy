import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { donationService } from '../backend/services/donationService';
import type { Community } from '../backend/types';
import IfoodGiftFlowCard from '../components/donation/IfoodGiftFlowCard';
import { ShieldAlert, Loader2, Info } from 'lucide-react';
import './DonationChoice.css';

const BigDonation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, selectedRegion } = useAppContext();
  const { showToast } = useToast();
  
  const community = location.state?.community as Community | undefined;
  
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!community && !selectedRegion) {
    navigate('/explore');
    return null;
  }

  const regionName = selectedRegion || community?.name || 'todas as regiões';

  const amounts = [
    { value: 100, impact: 'Apoio ampliado regional' },
    { value: 250, impact: 'Geração de grande impacto local' },
    { value: 500, impact: 'Transformação massiva de famílias' },
  ];

  const handleContinue = async () => {
    if (!selectedAmount) return;
    
    setIsProcessing(true);
    try {
      const result = await donationService.createBigDonation({
        totalAmount: selectedAmount,
        communityId: community?.id || 'all',
        donorId: user?.id || `anon-${Date.now()}`,
      });

      navigate('/success', { state: { bigDonationResult: result } });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao distribuir créditos iFood.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="donation-choice-page">
      <AppHeader title="Apoio Regional" showBack onBack={() => navigate(-1)} />
      
      <main className="content p-4">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert size={28} className="text-secondary" />
          <h1 className="page-title text-primary m-0">Apoio regional iFood</h1>
        </div>
        <p className="page-subtitle mb-4">Distribuímos vários <strong>créditos iFood</strong> entre as famílias que mais precisam em <strong>{regionName}</strong>.</p>

        <IfoodGiftFlowCard />
        
        <section className="amounts-section mb-6">
          <div className="amount-cards-grid">
            {amounts.map((item) => (
              <div 
                key={item.value}
                className={`amount-card ${selectedAmount === item.value ? 'selected' : ''} ${isProcessing ? 'disabled' : ''}`}
                onClick={() => { if(!isProcessing) setSelectedAmount(item.value) }}
                style={{ gridColumn: 'span 2' }} // Big cards for Big Donation
              >
                <div className="amount-value">R$ {item.value}</div>
                <div className="amount-impact">{item.impact}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="info-box p-4 bg-surface-highest rounded-md flex gap-3">
          <Info size={24} className="text-primary shrink-0" />
          <p className="text-sm">
            Mapeamos famílias elegíveis e geramos um gift iFood por família, com o valor fracionado do total. O recibo mostra quantos créditos foram enviados.
          </p>
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
          variant="secondary"
        >
          {isProcessing ? 'Gerando gifts iFood...' : (selectedAmount ? `Distribuir R$ ${selectedAmount} via iFood` : 'Continuar')}
        </Button>
      </div>
    </div>
  );
};

export default BigDonation;
