import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { Community } from '../backend/types';
import { ShieldAlert, Loader2, Info, Check, MapPin } from 'lucide-react';
import './DonationChoice.css';

const BigDonation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedRegion, setSelectedRegion } = useAppContext();
  const { showToast } = useToast();
  
  const community = location.state?.community as Community | undefined;
  
  const [selectedAmount, setSelectedAmount] = useState<number | null>(250);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetBairro, setTargetBairro] = useState<string>(community?.name || selectedRegion || 'all');

  const regionName = targetBairro === 'all' ? 'todas as regiões' : targetBairro;

  const amounts = [
    { value: 100, impact: 'Alimenta cerca de 4 famílias em situação de extrema vulnerabilidade' },
    { value: 250, impact: 'Alimenta cerca de 10 famílias e fortalece as cozinhas da comunidade' },
    { value: 500, impact: 'Transformação massiva de até 20 famílias com suporte alimentar integral' },
  ];

  const handleContinue = async () => {
    if (!selectedAmount) return;
    
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResult = {
        donation: {
          id: `bigdon-${Date.now()}`,
          amount: selectedAmount,
          createdAt: new Date().toISOString(),
        },
        giftCard: {
          label: `Apoio Coletivo Ampliado - ${regionName}`,
          code: 'GC-BIG-2026',
          provider: 'Rede Multi-Parceiros'
        },
        familyAssigned: {
          representativeName: `Rede de Famílias em ${regionName}`,
          childrenCount: selectedAmount === 100 ? 8 : (selectedAmount === 250 ? 22 : 45)
        }
      };

      navigate('/success', { 
        state: { 
          donationResult: mockResult, 
          isBatch: true, 
          count: selectedAmount === 100 ? 4 : (selectedAmount === 250 ? 10 : 20),
          totalAmount: selectedAmount
        } 
      });
    } catch (err: any) {
      showToast('Erro ao processar apoio coletivo.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="donation-choice-page">
      <AppHeader title="Apoio Ampliado" showBack onBack={() => navigate(-1)} />
      
      <main className="content p-4">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert size={28} className="text-secondary" />
          <h1 className="page-title text-primary m-0" style={{ fontSize: '1.4rem' }}>Apoio Coletivo Regional</h1>
        </div>
        <p className="page-subtitle text-xs text-outline mb-6">Seu apoio será distribuído automaticamente entre as famílias que mais precisam.</p>
        
        {/* Region Selector */}
        <section className="region-selector mb-6">
          <div className="region-card p-3 bg-white rounded-md border border-outline/10 flex items-center gap-3">
            <MapPin size={20} className="text-secondary shrink-0" />
            <div className="flex-1">
              <span className="region-label block text-[10px] uppercase font-bold text-outline">Comunidade Alvo</span>
              <select 
                className="w-full font-bold text-primary bg-transparent border-none outline-none text-sm p-0"
                value={targetBairro}
                onChange={(e) => {
                  setTargetBairro(e.target.value);
                  if (e.target.value !== 'all') {
                    setSelectedRegion(e.target.value);
                  }
                }}
                disabled={isProcessing || !!community}
              >
                <option value="all">Todas as Regiões</option>
                <option value="Heliópolis">Heliópolis</option>
                <option value="Paraisópolis">Paraisópolis</option>
                <option value="Cidade Tiradentes">Cidade Tiradentes</option>
                <option value="Brasilândia">Brasilândia</option>
              </select>
            </div>
          </div>
        </section>

        {/* Tiers Grid */}
        <section className="amounts-section mb-6">
          <div className="amount-cards-grid flex flex-col gap-3">
            {amounts.map((item) => {
              const isSelected = selectedAmount === item.value;
              return (
                <button 
                  key={item.value}
                  type="button"
                  className={`amount-card text-left p-4 rounded-md border transition-all flex justify-between items-center ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-outline/10 bg-white'
                  } ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
                  onClick={() => { if(!isProcessing) setSelectedAmount(item.value) }}
                >
                  <div className="flex-1">
                    <div className="amount-value text-xl font-extrabold text-primary">R$ {item.value}</div>
                    <div className="amount-impact text-xs text-outline leading-relaxed">{item.impact}</div>
                  </div>
                  {isSelected && <Check size={18} className="text-primary ml-2 shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="info-box p-4 bg-surface-highest/60 rounded-md border border-outline/10 flex gap-3">
          <Info size={24} className="text-primary shrink-0" />
          <p className="text-xs text-outline leading-relaxed">
            Nós mapeamos as famílias elegíveis na região de <strong>{regionName}</strong> e distribuiremos o valor de forma inteligente criando múltiplos vales alimentação digitais. O recibo detalhará o impacto real.
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
          {isProcessing ? 'Processando...' : (selectedAmount ? `Distribuir R$ ${selectedAmount}` : 'Continuar')}
        </Button>
      </div>
    </div>
  );
};

export default BigDonation;
