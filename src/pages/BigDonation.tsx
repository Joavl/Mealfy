import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { Community } from '../backend/types';
import { ShieldAlert, Info, Check, MapPin } from 'lucide-react';
import './DonationChoice.css';

const BigDonation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedRegion, setSelectedRegion } = useAppContext();
  const { showToast } = useToast();
  
  const community = location.state?.community as Community | undefined;
  
  const [selectedAmount, setSelectedAmount] = useState<number | null>(250);
  const [targetBairro, setTargetBairro] = useState<string>(community?.name || selectedRegion || 'all');

  const regionName = targetBairro === 'all' ? 'todas as regiões' : targetBairro;

  const amounts = [
    { value: 100, impact: 'Alimenta cerca de 4 famílias em situação de extrema vulnerabilidade' },
    { value: 250, impact: 'Alimenta cerca de 10 famílias e fortalece as cozinhas da comunidade' },
    { value: 500, impact: 'Transformação massiva de até 20 famílias com suporte alimentar integral' },
  ];

  const handleContinue = () => {
    if (!selectedAmount) return;

    // Não existe contrato de cobrança regional no backend. Não simulamos uma
    // doação, vale ou famílias atendidas até que a operação seja implementada.
    showToast('O apoio coletivo regional ainda não está disponível para pagamento. Nenhuma doação ou vale foi gerado.', 'error');
  };

  return (
    <div className="donation-choice-page">
      <AppHeader title="Apoio Ampliado" showBack onBack={() => navigate(-1)} />
      
      <main className="content p-4">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert size={28} className="text-secondary" />
          <h1 className="page-title text-primary m-0" style={{ fontSize: '1.4rem' }}>Apoio Coletivo Regional</h1>
        </div>
        <p className="page-subtitle text-xs text-outline mb-6">Este fluxo será disponibilizado quando houver uma operação de pagamento autoritativa para distribuição regional.</p>
        
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
                disabled={!!community}
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
                  } `}
                  onClick={() => setSelectedAmount(item.value)}
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
            A distribuição regional para <strong>{regionName}</strong> ainda não está disponível. Nenhuma família será marcada como atendida e nenhum vale será criado nesta tela.
          </p>
        </section>
      </main>

      <div className="fixed-bottom-action">
        <Button 
          size="large" 
          fullWidth 
          onClick={handleContinue}
          className="shadow-glow"
          disabled={!selectedAmount}
          variant="secondary"
        >
          {selectedAmount ? `Avisar quando R$ ${selectedAmount} estiver disponível` : 'Continuar'}
        </Button>
      </div>
    </div>
  );
};

export default BigDonation;
