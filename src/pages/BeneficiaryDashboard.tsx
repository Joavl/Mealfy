import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { familyService } from '../backend/services/familyService';
import { donationService } from '../backend/services/donationService';
import { getGiftStatusLabel, getIfoodRedeemDeepLink, IFOOD_REDEEM_STEPS } from '../lib/ifoodGift';
import { Gift, Calendar, Heart, Clock, Smartphone, Copy, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import type { Family, GiftCard } from '../backend/types';
import './BeneficiaryDashboard.css';

const BeneficiaryDashboard: React.FC = () => {
  const { user } = useAppContext();
  const { showToast } = useToast();
  const [family, setFamily] = useState<Family | null>(null);
  const [giftHistory, setGiftHistory] = useState<GiftCard[]>([]);
  const [activeGift, setActiveGift] = useState<GiftCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.beneficiaryId) {
      setLoading(false);
      return;
    }

    const fam = await familyService.getFamilyById(user.beneficiaryId);
    const [history, active] = await Promise.all([
      donationService.getGiftCardsByFamily(user.beneficiaryId),
      donationService.getActiveGiftForFamily(user.beneficiaryId),
    ]);

    setFamily(fam || null);
    setGiftHistory(history);
    setActiveGift(active);
    setLoading(false);
  }, [user?.beneficiaryId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCopyCode = async () => {
    if (!activeGift?.code) return;
    try {
      await navigator.clipboard.writeText(activeGift.code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = activeGift.code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    showToast('Código copiado! Cole no app iFood.', 'success');
    window.setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenIfood = () => {
    if (!activeGift?.code) return;
    window.open(getIfoodRedeemDeepLink(activeGift.code), '_blank', 'noopener,noreferrer');
  };

  const handleRedeem = async () => {
    if (!activeGift?.id) return;
    setRedeeming(true);
    try {
      const { giftCard } = await donationService.redeemGiftCard(activeGift.id);
      setActiveGift(giftCard);
      setGiftHistory((prev) =>
        prev.map((g) => (g.id === giftCard.id ? giftCard : g)),
      );
      showToast('Crédito marcado como resgatado no Mealfy. Use o código no iFood.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível confirmar o resgate.';
      showToast(msg, 'error');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="beneficiary-dashboard-page p-6 flex items-center justify-center" style={{ height: '80vh' }}>
        <Clock className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  const isRedeemed = activeGift?.status === 'redeemed' || activeGift?.status === 'used';
  const hasActiveGift =
    activeGift &&
    !isRedeemed &&
    (activeGift.status === 'sent' || activeGift.status === 'generated' || activeGift.status === 'delivered');

  return (
    <div className="beneficiary-dashboard-page">
      <AppHeader title="Meu Benefício" />

      <main className="content p-4">
        <section className="welcome-header mb-6">
          <h2 className="text-2xl font-bold text-primary mb-1">
            Olá, {family?.representativeName || user?.name}
          </h2>
          <p className="text-sm text-outline">
            Créditos iFood enviados por doadores — resgate no app e peça refeições para sua família.
          </p>
        </section>

        <section className="status-card mb-6 p-6 bg-primary text-inverted rounded-2xl shadow-glow-soft">
          <div className="flex items-center gap-4 mb-4">
            <div className="status-icon bg-white/20 p-3 rounded-full">
              <Heart
                size={24}
                fill={family?.supportStatus === 'fed' ? 'white' : 'transparent'}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs opacity-80 uppercase font-bold tracking-wider">Status</span>
              <span className="text-xl font-bold">
                {hasActiveGift
                  ? 'Crédito iFood disponível'
                  : isRedeemed
                    ? 'Crédito resgatado'
                    : family?.supportStatus === 'fed'
                      ? 'Apoiado recentemente'
                      : 'Aguardando apoio'}
              </span>
            </div>
          </div>
          <p className="text-xs opacity-90 leading-relaxed">
            {hasActiveGift
              ? 'Copie o código abaixo e use na Carteira do iFood, ou abra o app pelo botão.'
              : isRedeemed
                ? 'Este crédito já foi confirmado. Se ainda não usou no iFood, o código continua válido.'
                : 'Quando um doador enviar apoio, o gift card aparecerá aqui automaticamente.'}
          </p>
        </section>

        <section className="gift-cards-section mb-6">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <Gift size={18} className="text-secondary" />
            <span>Crédito iFood</span>
          </h3>

          {activeGift ? (
            <div className="gift-card-display p-4 bg-surface-highest border-2 border-dashed border-[#ea1d2c]/40 rounded-xl text-center">
              <span className="ifood-beneficiary-badge">Parceiro iFood</span>
              <p className="text-sm font-semibold text-primary mt-2 mb-1">{activeGift.label}</p>
              <span className="text-xs text-outline block mb-1">CÓDIGO NO APP IFOOD</span>
              <span className="text-2xl font-mono font-black text-secondary tracking-widest">
                {activeGift.code}
              </span>
              <p className="text-[10px] text-outline mt-2 flex items-center justify-center gap-1">
                <Smartphone size={12} />
                {getGiftStatusLabel(activeGift.status)}
              </p>

              <div className="ifood-redeem-actions mt-4 flex flex-col gap-2">
                <Button
                  size="medium"
                  fullWidth
                  icon={copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                  onClick={() => void handleCopyCode()}
                >
                  {copied ? 'Código copiado' : 'Copiar código'}
                </Button>
                <Button
                  variant="outline"
                  size="medium"
                  fullWidth
                  icon={<ExternalLink size={18} />}
                  onClick={handleOpenIfood}
                >
                  Abrir iFood
                </Button>
                {hasActiveGift && (
                  <Button
                    size="medium"
                    fullWidth
                    disabled={redeeming}
                    icon={redeeming ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    onClick={() => void handleRedeem()}
                  >
                    {redeeming ? 'Confirmando...' : 'Confirmar que resgatei no iFood'}
                  </Button>
                )}
              </div>

              <ol className="ifood-steps-list mt-4 text-left">
                {IFOOD_REDEEM_STEPS.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="empty-state p-8 text-center bg-surface-highest rounded-xl border border-outline/5">
              <p className="text-sm text-outline italic">Nenhum crédito iFood ativo no momento.</p>
              <p className="text-[10px] text-outline mt-1">
                Novos gifts aparecem assim que doadores da região confirmarem o apoio.
              </p>
            </div>
          )}
        </section>

        <section className="history-preview">
          <h3 className="section-title mb-4">Histórico de recebimentos</h3>
          {giftHistory.length === 0 ? (
            <p className="text-xs text-outline text-center py-4 bg-surface rounded-xl italic">
              Ainda não há créditos iFood registrados.
            </p>
          ) : (
            <div className="flex-col gap-3">
              {giftHistory.slice(0, 8).map((gift) => (
                <div
                  key={gift.id}
                  className="history-item p-3 bg-surface rounded-lg border border-outline/5 flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-outline" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm">
                        {new Date(gift.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-outline">
                        {getGiftStatusLabel(gift.status)}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-success">R$ {gift.amount}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default BeneficiaryDashboard;
