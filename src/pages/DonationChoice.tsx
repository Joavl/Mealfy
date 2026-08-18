import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Users, Check, ChevronRight } from 'lucide-react';
import { giftCardService } from '../backend/services/giftCardService';
import { donationsApi } from '../api/donationsApi';
import { ApiError, ApiNetworkError } from '../api/apiClient';
import { familyService } from '../backend/services/familyService';
import { PROVIDER_LABELS } from '../backend/mockData/giftCardInventory';
import { isBeneficiaryEligible } from '../backend/utils/timeUtils';
import type { GiftCardProvider } from '../backend/types';
import './DonationChoice.css';

const DonationChoice: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCommunity, user } = useAppContext();
  const { showToast } = useToast();
  
  // Navigation states
  const targetFamily = location.state?.targetFamily as any; 
  const selectedFamilyIds = location.state?.selectedFamilyIds as string[] | undefined;
  
  const isBatch = !!selectedFamilyIds && selectedFamilyIds.length > 0;
  const initialFamilyCount = isBatch ? selectedFamilyIds!.length : (targetFamily ? 1 : 1);

  // Wizard Steps
  // Steps: 'families' -> 'children' -> 'summary'
  const [wizardStep, setWizardStep] = useState<'families' | 'children' | 'summary'>('families');
  
  // Selection States
  const [familiesCount, setFamiliesCount] = useState<number>(initialFamilyCount);
  const [childrenTier, setChildrenTier] = useState<'1' | '2' | '3' | 'todos'>('todos');
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // If a target family is passed, lock the children tier automatically
  useEffect(() => {
    if (targetFamily) {
      const cnt = targetFamily.childrenCount;
      if (cnt === 1) setChildrenTier('1');
      else if (cnt === 2) setChildrenTier('2');
      else setChildrenTier('3');
      
      setWizardStep('summary'); // Skip setup steps for direct family support
    } else if (isBatch) {
      setWizardStep('children'); // Skip family count stepper since we have batch selection
    }
  }, [targetFamily, isBatch]);

  // Calculate pricing
  const getTierPrice = (tier: typeof childrenTier) => {
    switch (tier) {
      case '1': return 25;
      case '2': return 40;
      case '3': return 50;
      case 'todos':
      default: return 35;
    }
  };

  const getTierDescription = (tier: typeof childrenTier) => {
    switch (tier) {
      case '1': return '1 filho por família (R$ 25)';
      case '2': return '2 filhos por família (R$ 40)';
      case '3': return '3+ filhos por família (R$ 50)';
      case 'todos':
      default: return 'Distribuição mista (média R$ 35)';
    }
  };

  const pricePerFamily = getTierPrice(childrenTier);
  const totalAmount = familiesCount * pricePerFamily;

  const handleContinue = async () => {
    setIsProcessing(true);
    try {
      // ── Regra crítica (nível service): revalida contra a fonte de verdade ──
      // Mesmo se a UI falhar, doação repetida no mesmo dia é bloqueada aqui.
      if (targetFamily) {
        const fresh = await familyService.getFamilyById(targetFamily.id);
        if (fresh && !isBeneficiaryEligible(fresh)) {
          showToast('Esta família já foi alimentada hoje. Próxima liberação às 08h.', 'error');
          setIsProcessing(false);
          return;
        }
      }

      // ── Fluxo REAL (API): família direta → cria doação + cobrança Pix ──
      // O vale só é liberado APÓS o pagamento confirmar (webhook) — nunca antes.
      if (targetFamily) {
        try {
          const resp = await donationsApi.createDonation({
            familyId: targetFamily.id,
            amount: Math.round(totalAmount * 100), // backend trabalha em centavos
          });
          if (resp?.payment) {
            navigate('/success', {
              state: {
                pixResult: {
                  donation: resp.donation,
                  payment: resp.payment,
                  familyName: targetFamily.representativeName,
                },
                totalAmount,
              }
            });
            return;
          }
        } catch (apiErr: any) {
          // Erro de NEGÓCIO da API (família já alimentada hoje, sem estoque, etc.):
          // NÃO cair no mock — a doação não aconteceu. Mostra o erro e aborta.
          if (apiErr instanceof ApiError) {
            showToast(apiErr.message || 'Não foi possível criar a doação.', 'error');
            setIsProcessing(false);
            return;
          }
          if (!(apiErr instanceof ApiNetworkError)) throw apiErr;
          // ApiNetworkError → backend fora do ar (dev local): segue para o mock abaixo.
        }
      }

      // ── Fluxo MOCK (somente dev, sem backend no ar): libera código do localStorage ──
      await new Promise(resolve => setTimeout(resolve, 1200));
      giftCardService.initInventory();

      let releasedCode: string;
      let provider: GiftCardProvider;
      let label: string;

      if (targetFamily) {
        // Provider REAL escolhido pela família beneficiária
        provider = (targetFamily.preferredGiftCardProvider as GiftCardProvider) || 'ifood';
        const card = giftCardService.releaseCode(provider); // lança erro se sem estoque
        releasedCode = card.code;
        label = `Vale ${PROVIDER_LABELS[provider]} — ${targetFamily.representativeName}`;
        // Persiste "alimentada hoje" na fonte de verdade (bloqueia nova doação no dia)
        await familyService.markFamilyFed(targetFamily.id, {
          donationId: `don-${Date.now()}`, provider, code: releasedCode,
          donorName: user?.privacySettings?.anonymousMode ? 'Apoiador anônimo' : (user?.name || 'Apoiador'),
          donorInstagram: user?.privacySettings?.anonymousMode ? undefined : user?.instagram,
          donorAvatar: user?.avatar,
        });
      } else {
        // Apoio coletivo: libera 1 código por família, usando providers com estoque
        const order: GiftCardProvider[] = ['ifood', '99', 'carrefour'];
        const codes: string[] = [];
        let lastProvider: GiftCardProvider = 'ifood';
        for (let i = 0; i < familiesCount; i++) {
          const p = order.find(pp => giftCardService.countAvailable(pp) > 0);
          if (!p) throw new Error('Sem códigos de vale disponíveis em estoque no momento.');
          codes.push(giftCardService.releaseCode(p).code);
          lastProvider = p;
        }
        releasedCode = codes[0];
        provider = lastProvider;
        label = `Apoio Coletivo — ${familiesCount} ${familiesCount === 1 ? 'família' : 'famílias'} (${codes.length} vales)`;
      }

      const result = {
        donation: {
          id: `don-${Date.now()}`,
          amount: totalAmount,
          createdAt: new Date().toISOString(),
        },
        giftCard: { label, code: releasedCode, provider },
        familyAssigned: {
          representativeName: targetFamily ? targetFamily.representativeName : `${familiesCount} ${familiesCount === 1 ? 'família' : 'famílias'}`,
          childrenCount: targetFamily ? targetFamily.childrenCount : 2
        }
      };

      navigate('/success', {
        state: {
          donationResult: result,
          isBatch: isBatch || familiesCount > 1,
          count: familiesCount,
          totalAmount
        }
      });
    } catch (err: any) {
      // Sem estoque ou erro de liberação: NÃO navega — a doação não parece concluída.
      showToast(err?.message || 'Não foi possível liberar o vale agora. Tente novamente.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Safe checks
  const communityName = selectedCommunity?.name || 'Região Selecionada';

  return (
    <div className="donation-choice-page">
      <AppHeader title="Combater a Fome" showBack onBack={() => navigate(-1)} />
      
      <main className="content p-4">
        {/* Progress header */}
        <div className="wizard-progress mb-6 flex justify-between items-center bg-surface-highest/40 p-3 rounded-md border border-outline/5">
          <span className={`progress-step-label text-xs font-bold ${wizardStep === 'families' ? 'text-primary' : 'text-outline/50'}`}>
            1. Famílias
          </span>
          <ChevronRight size={14} className="text-outline/30" />
          <span className={`progress-step-label text-xs font-bold ${wizardStep === 'children' ? 'text-primary' : 'text-outline/50'}`}>
            2. Crianças
          </span>
          <ChevronRight size={14} className="text-outline/30" />
          <span className={`progress-step-label text-xs font-bold ${wizardStep === 'summary' ? 'text-primary' : 'text-outline/50'}`}>
            3. Resumo
          </span>
        </div>

        {/* ── STEP 1: Families Count Stepper ── */}
        {wizardStep === 'families' && (
          <div className="wizard-step-content fade-in">
            <h2 className="step-title text-primary font-bold text-lg mb-2">Quantas famílias você quer ajudar?</h2>
            <p className="step-subtitle text-xs text-outline mb-6">Cada família selecionada receberá um vale alimentação direto.</p>
            
            <div className="stepper-container flex items-center justify-center gap-6 py-8 bg-surface rounded-md border border-outline/10 mb-8">
              <button 
                type="button"
                className="stepper-btn"
                disabled={familiesCount <= 1}
                onClick={() => setFamiliesCount(prev => Math.max(1, prev - 1))}
              >
                -
              </button>
              <div className="stepper-value flex flex-col items-center">
                <span className="value-number font-black text-primary text-4xl">{familiesCount}</span>
                <span className="value-label text-[10px] uppercase font-bold text-outline">Famílias</span>
              </div>
              <button 
                type="button"
                className="stepper-btn"
                onClick={() => setFamiliesCount(prev => prev + 1)}
              >
                +
              </button>
            </div>

            <Button 
              variant="primary" 
              fullWidth 
              size="large"
              onClick={() => setWizardStep('children')}
              className="mt-4"
            >
              Definir Perfil Familiar
            </Button>
          </div>
        )}

        {/* ── STEP 2: Children Count Options ── */}
        {wizardStep === 'children' && (
          <div className="wizard-step-content fade-in">
            <h2 className="step-title text-primary font-bold text-lg mb-2">Quantos filhos por família?</h2>
            <p className="step-subtitle text-xs text-outline mb-6">Ajuste o apoio financeiro baseado no tamanho da família.</p>
            
            <div className="tier-options-list flex flex-col gap-3 mb-8">
              <button 
                type="button"
                className={`tier-option-card text-left p-4 rounded-md border transition-all flex justify-between items-center ${
                  childrenTier === '1' ? 'border-primary bg-primary/5' : 'border-outline/10 bg-white'
                }`}
                onClick={() => setChildrenTier('1')}
              >
                <div>
                  <h4 className="font-bold text-primary text-sm">1 Filho</h4>
                  <span className="text-xs text-outline">Destina R$ 25 por família alimentada</span>
                </div>
                {childrenTier === '1' && <Check size={18} className="text-primary" />}
              </button>

              <button 
                type="button"
                className={`tier-option-card text-left p-4 rounded-md border transition-all flex justify-between items-center ${
                  childrenTier === '2' ? 'border-primary bg-primary/5' : 'border-outline/10 bg-white'
                }`}
                onClick={() => setChildrenTier('2')}
              >
                <div>
                  <h4 className="font-bold text-primary text-sm">2 Filhos</h4>
                  <span className="text-xs text-outline">Destina R$ 40 por família alimentada</span>
                </div>
                {childrenTier === '2' && <Check size={18} className="text-primary" />}
              </button>

              <button 
                type="button"
                className={`tier-option-card text-left p-4 rounded-md border transition-all flex justify-between items-center ${
                  childrenTier === '3' ? 'border-primary bg-primary/5' : 'border-outline/10 bg-white'
                }`}
                onClick={() => setChildrenTier('3')}
              >
                <div>
                  <h4 className="font-bold text-primary text-sm">3+ Filhos</h4>
                  <span className="text-xs text-outline">Destina R$ 50 por família alimentada</span>
                </div>
                {childrenTier === '3' && <Check size={18} className="text-primary" />}
              </button>

              <button 
                type="button"
                className={`tier-option-card text-left p-4 rounded-md border transition-all flex justify-between items-center ${
                  childrenTier === 'todos' ? 'border-primary bg-primary/5' : 'border-outline/10 bg-white'
                }`}
                onClick={() => setChildrenTier('todos')}
              >
                <div>
                  <h4 className="font-bold text-primary text-sm">Qualquer perfil (Recomendado)</h4>
                  <span className="text-xs text-outline">Destina uma média de R$ 35 por família</span>
                </div>
                {childrenTier === 'todos' && <Check size={18} className="text-primary" />}
              </button>
            </div>

            <div className="flex gap-3">
              {!isBatch && (
                <Button 
                  variant="outline" 
                  fullWidth 
                  onClick={() => setWizardStep('families')}
                >
                  Voltar
                </Button>
              )}
              <Button 
                variant="primary" 
                fullWidth 
                onClick={() => setWizardStep('summary')}
              >
                Ver Resumo
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Summary Screen ── */}
        {wizardStep === 'summary' && (
          <div className="wizard-step-content fade-in">
            <h2 className="step-title text-primary font-bold text-lg mb-2">Resumo da sua Ação</h2>
            <p className="step-subtitle text-xs text-outline mb-6">Revise as informações antes de confirmar o apoio alimentar.</p>
            
            {/* Target Card details */}
            <div className="summary-details-card bg-surface p-4 rounded-md border border-outline/10 mb-6 flex flex-col gap-3">
              {targetFamily ? (
                <div className="flex items-center gap-3 bg-white p-3 rounded border border-outline/5">
                  <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center text-primary font-bold">
                    {targetFamily.representativeName.charAt(0)}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-secondary uppercase block">Família Direta</span>
                    <span className="font-bold text-primary text-sm">{targetFamily.representativeName}</span>
                    <span className="text-[10px] text-outline block">{targetFamily.neighborhood} • {targetFamily.childrenCount} filhos</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-white p-3 rounded border border-outline/5">
                  <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center text-primary">
                    <Users size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-secondary uppercase block">Apoio Coletivo</span>
                    <span className="font-bold text-primary text-sm">{familiesCount} {familiesCount === 1 ? 'Família' : 'Famílias'}</span>
                    <span className="text-[10px] text-outline block">Região: {communityName}</span>
                  </div>
                </div>
              )}

              <div className="w-full border-t border-outline/10 my-1"></div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-outline">Preço por família:</span>
                <span className="font-bold text-text-main">R$ {pricePerFamily.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-outline">Perfil de crianças:</span>
                <span className="font-bold text-text-main">{getTierDescription(childrenTier)}</span>
              </div>

              <div className="w-full border-t border-outline/10 my-1"></div>

              {/* Total Display */}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-extrabold text-primary">VALOR TOTAL:</span>
                <span className="text-2xl font-black text-secondary">R$ {totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Recurrent option */}
            <div className="bg-surface-highest/60 p-4 rounded-md border border-outline/5 mb-6 flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isRecurrent} 
                  onChange={(e) => setIsRecurrent(e.target.checked)} 
                  disabled={isProcessing}
                />
                <span className="text-sm font-bold text-primary">Quero apoiar essa família novamente quando estiver disponível</span>
              </label>
              <p className="text-[10px] text-outline pl-6 leading-relaxed">
                A Mealfy poderá te lembrar quando essa família estiver disponível novamente para receber apoio. A doação só acontece com nova confirmação sua — sem cobrança automática.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {!targetFamily && (
                <Button 
                  variant="outline" 
                  fullWidth 
                  disabled={isProcessing}
                  onClick={() => setWizardStep('children')}
                >
                  Voltar
                </Button>
              )}
              <Button 
                variant="primary" 
                fullWidth 
                size="large"
                className="bg-secondary text-primary font-black"
                loading={isProcessing}
                onClick={handleContinue}
              >
                Confirmar e Alimentar
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DonationChoice;
