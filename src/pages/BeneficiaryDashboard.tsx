import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import StoriesRanking from '../components/ui/StoriesRanking';
import InstagramSection from '../components/ui/InstagramSection';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { familyService } from '../backend/services/familyService';
import { familiesApi } from '../api/familiesApi';
import { beneficiaryApi } from '../api/giftcardsApi';
import { Gift, Calendar, Heart, Clock, AlertTriangle, QrCode, Copy, Phone, ShieldCheck, ShieldAlert, ChevronRight, Check } from 'lucide-react';
import type { Family } from '../backend/types';
import GiftCardSelectorModal, { GIFT_CARD_PARTNERS } from '../components/ui/GiftCardSelectorModal';
import MessagePicker from '../components/ui/MessagePicker';
import './BeneficiaryDashboard.css';

const GIFT_CARD_CODE_PREFIX: Record<string, string> = {
  ifood: 'IFOD',
  carrefour: 'CRFU',
  '99': '99FD',
};

/** Gift card real vindo da API (código decifrado — só o beneficiário vê). */
interface ApiGiftCard {
  id: string;
  provider: string;
  code: string;
  amount: number; // centavos
  status: string;
  expiresAt?: string | null;
  releasedAt?: string | null;
  instructions?: string;
  /** Doação de origem — necessária para responder ao doador. */
  donationId?: string | null;
  donorMessage?: { body: string; createdAt: string } | null;
  myReply?: { templateKey: string; body: string } | null;
}

const apiProviderLabel = (p: string): string =>
  p === 'ninetynine' ? '99 Mercado' : p === 'ifood' ? 'iFood' : 'Carrefour';

const BeneficiaryDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, stories } = useAppContext();
  const { showToast } = useToast();
  
  const [family, setFamily] = useState<Family | null>(null);
  /**
   * Histórico de apoios RECEBIDOS — derivado dos vales liberados para a família.
   * Não usa `/me/donations`: aquela rota é exclusiva do doador (roleGuard) e
   * respondia 403 para o beneficiário.
   */
  const [history, setHistory] = useState<
    { donation: { createdAt: string; amount: number }; giftCard: ApiGiftCard | null }[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Vales reais da API. null = API indisponível ou usuário sem vínculo de beneficiário
  // (mantém o fluxo local/mock de dev). Array (mesmo vazio) = API respondeu de verdade.
  const [apiCards, setApiCards] = useState<ApiGiftCard[] | null>(null);

  // Simulated status switcher for testing in DEV mode
  const [simulatedStatus, setSimulatedStatus] = useState<'approved' | 'pending' | 'rejected'>('approved');

  // ── Gift card partner selection (mock, persisted locally) ──────────────────
  const giftCardStorageKey = `mealfy_giftcard_${user?.id || 'guest'}`;
  const [giftCardProvider, setGiftCardProvider] = useState<string>(
    () => localStorage.getItem(giftCardStorageKey) || 'ifood'
  );
  const [showGiftCardSelector, setShowGiftCardSelector] = useState(false);
  const selectedPartner = GIFT_CARD_PARTNERS.find((p) => p.id === giftCardProvider) || GIFT_CARD_PARTNERS[0];

  // ── Status de verificação Gov.br (mock visual) ──────────────────────────────
  const isGovVerified = false;

  // Doação para a qual o beneficiário está respondendo (null = folha fechada).
  const [replyToDonationId, setReplyToDonationId] = useState<string | null>(null);

  // Solicitação do dia: vale por um ciclo (reset 08h) e precisa ser refeita.
  const [requestedToday, setRequestedToday] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestSupport = async () => {
    if (!family?.id || isRequesting) return;
    setIsRequesting(true);
    try {
      await familiesApi.requestDailySupport(family.id, giftCardProvider);
      setRequestedToday(true);
      showToast('Pedido enviado! Sua família já aparece para os apoiadores.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível solicitar agora.', 'error');
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // ── Família: vem do vínculo REAL no backend (families.beneficiaryUserId).
      // Antes dependia de `user.beneficiaryId`, um id que só existia no cache
      // local herdado do mock — um beneficiário de verdade via a tela vazia.
      let resolvedFamilyId: string | null = null;
      try {
        const resp = await beneficiaryApi.getMyFamily();
        if (resp?.family) {
          setFamily(resp.family as any);
          setSimulatedStatus((resp.family.approvalStatus as any) || 'approved');
          setRequestedToday(Boolean(resp.family.requestedToday));
          resolvedFamilyId = resp.family.id;
        }
      } catch {
        // 403 sem vínculo / API fora: cai no id local, se existir (dev/offline).
        if (user.beneficiaryId) {
          const fam = await familyService.getFamilyById(user.beneficiaryId).catch(() => null);
          if (fam) {
            setFamily(fam);
            setSimulatedStatus((fam.status as any) || 'approved');
            resolvedFamilyId = fam.id;
          }
        }
      }

      // ── Vales do beneficiário (único lugar que devolve o código decifrado) ──
      let cards: ApiGiftCard[] | null = null;
      if (resolvedFamilyId) {
        try {
          const resp = await beneficiaryApi.getMyGiftCards();
          if (resp && Array.isArray(resp.giftCards)) {
            cards = resp.giftCards;
            setApiCards(cards);
          }
        } catch {
          // 401/403 (sem vínculo) ou API fora do ar → mantém o fluxo local.
        }
      }

      // ── Histórico: para o beneficiário é o que ele RECEBEU.
      // `/me/donations` é exclusivo de doador (roleGuard) e respondia 403 aqui —
      // o histórico correto sai dos próprios vales liberados.
      if (cards) {
        setHistory(
          cards.map((c) => ({
            donation: { createdAt: c.releasedAt ?? new Date().toISOString(), amount: c.amount / 100 },
            giftCard: c,
          })),
        );
      } else {
        setHistory([]);
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast('Código do vale-refeição copiado!', 'success');
  };

  // ── Dados reais da API (quando disponíveis) ──────────────────────────────
  const sortedApiCards = apiCards
    ? [...apiCards].sort((a, b) => new Date(b.releasedAt ?? 0).getTime() - new Date(a.releasedAt ?? 0).getTime())
    : null;
  const latestApiCard = sortedApiCards && sortedApiCards.length > 0 ? sortedApiCards[0] : null;
  const fedToday = latestApiCard?.releasedAt
    ? new Date(latestApiCard.releasedAt).toDateString() === new Date().toDateString()
    : false;

  const handleRequestReview = () => {
    showToast('Pedido de re-análise enviado à entidade Heliópolis Solidária!', 'success');
  };

  const handleGiftCardConfirm = (providerId: string) => {
    setGiftCardProvider(providerId);
    localStorage.setItem(giftCardStorageKey, providerId);
    setShowGiftCardSelector(false);
    const partner = GIFT_CARD_PARTNERS.find((p) => p.id === providerId);
    showToast(`Vale-alimentação atualizado para ${partner?.name}!`, 'success');
  };

  if (loading) {
    return (
      <div className="beneficiary-dashboard-page p-6 flex items-center justify-center" style={{ height: '80vh' }}>
         <Clock className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="beneficiary-dashboard-page">
      <AppHeader title="Meu Painel" />

      {/* ── Carrossel de maiores doadores da plataforma ── */}
      <StoriesRanking
        donors={stories}
        currentUser={null}
        onSelectDonor={(donor: any) => { if (!donor.isSorteio) navigate(`/profile/${donor.id}`); }}
      />

      {/* ── DEV Mode State Switcher ── */}
      {import.meta.env.DEV && (
        <div className="dev-state-switcher p-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
            <Clock size={12} /> Testar Estados (Apenas DEV)
          </span>
          <div className="flex gap-1">
            <button 
              className={`dev-btn text-[10px] px-2 py-1 ${simulatedStatus === 'pending' ? 'active' : ''}`}
              onClick={() => setSimulatedStatus('pending')}
            >
              Análise
            </button>
            <button 
              className={`dev-btn text-[10px] px-2 py-1 ${simulatedStatus === 'approved' ? 'active' : ''}`}
              onClick={() => setSimulatedStatus('approved')}
            >
              Aprovado
            </button>
            <button 
              className={`dev-btn text-[10px] px-2 py-1 ${simulatedStatus === 'rejected' ? 'active' : ''}`}
              onClick={() => setSimulatedStatus('rejected')}
            >
              Recusado
            </button>
          </div>
        </div>
      )}
      
      <main className="content p-4">
        {/* ── Welcome Row ── */}
        <section className="welcome-header mb-5">
           <h2 className="text-xl font-bold text-primary mb-1">Olá, {family?.representativeName || user?.name}</h2>
           <p className="text-sm text-outline mb-2">Acompanhe seus vales e a situação do seu cadastro.</p>
           {isGovVerified ? (
             <span className="badge-verification badge-verification--ok">
               <ShieldCheck size={12} className="mr-1" /> Verificado via Gov.br
             </span>
           ) : (
             <span className="badge-verification badge-verification--pending">
               <ShieldAlert size={12} className="mr-1" /> Identidade pendente
             </span>
           )}
        </section>

        {/* ── RENDER STATE: PENDING (Em análise) ── */}
        {simulatedStatus === 'pending' && (
          <div className="flex flex-col gap-4">
            <section className="status-banner bg-warning/10 border border-warning/30 p-6 rounded-lg text-center flex flex-col items-center">
              <Clock size={56} className="text-secondary mb-4 animate-pulse" />
              <h3 className="font-bold text-lg text-primary mb-2">Cadastro em Análise Física</h3>
              <p className="text-sm text-outline leading-relaxed">
                As informações fornecidas estão sob verificação da entidade parceira <strong>Heliópolis Solidária</strong>. 
                Uma visita domiciliar de rotina pode ser realizada para validação.
              </p>
              
              <div className="w-full border-t border-outline/10 my-4"></div>
              
              <div className="flex justify-between w-full text-xs text-outline">
                <span>Tempo de espera estimado:</span>
                <span className="font-bold text-primary">até 48 horas úteis</span>
              </div>
            </section>
            
            <section className="bg-white p-4 rounded-lg border border-outline/10">
              <h4 className="font-bold text-sm text-primary mb-2">O que acontece agora?</h4>
              <ul className="text-xs text-outline flex flex-col gap-2 list-disc pl-4">
                <li>Sua ficha será avaliada pela assistente social da comunidade.</li>
                <li>Havendo aprovação, você receberá um alerta automático pelo WhatsApp cadastrado.</li>
                <li>O vale-refeição iFood Alimentação será liberado neste aplicativo imediatamente.</li>
              </ul>
            </section>
          </div>
        )}

        {/* ── RENDER STATE: REJECTED (Recusado) ── */}
        {simulatedStatus === 'rejected' && (
          <div className="flex flex-col gap-4">
            <section className="status-banner bg-error/10 border border-error/30 p-6 rounded-lg text-center flex flex-col items-center">
              <AlertTriangle size={56} className="text-error mb-4" />
              <h3 className="font-bold text-lg text-error mb-2">Cadastro não Aprovado</h3>
              <p className="text-sm text-outline leading-relaxed mb-4">
                Não foi possível validar as informações informadas ou confirmar a elegibilidade na região indicada.
              </p>
              
              <div className="w-full bg-white p-3 rounded border border-outline/10 text-left mb-4">
                <span className="text-[10px] uppercase font-bold text-outline block">Motivo do Indeferimento</span>
                <span className="text-xs font-semibold text-text-main">
                  Divergência nos dados de residência comprovados ou cadastro fora do perímetro de Heliópolis.
                </span>
              </div>

              <Button 
                variant="primary" 
                fullWidth 
                icon={<Phone size={16} />}
                onClick={handleRequestReview}
              >
                Solicitar Revisão de Cadastro
              </Button>
            </section>

            <div className="bg-white p-4 rounded-lg border border-outline/10 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-semibold text-xs text-primary">Dúvidas? Fale com a Entidade</span>
                <span className="text-[10px] text-outline">Heliópolis Solidária (Rua das Flores, 45)</span>
              </div>
              <Button variant="outline" size="small" onClick={() => showToast('Ligando para a entidade...', 'info')}>
                Contato
              </Button>
            </div>
          </div>
        )}

        {/* ── RENDER STATE: APPROVED (Aprovado) ── */}
        {simulatedStatus === 'approved' && (
          <div className="flex flex-col gap-5">
            {/* Current Benefit status */}
            <section className="status-card p-6 bg-primary text-inverted rounded-lg shadow-glow-soft">
               <div className="flex items-center gap-4 mb-4">
                  <div className="status-icon bg-white/20 p-3 rounded-md">
                     <Heart size={24} className="text-inverted" fill="white" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] opacity-80 uppercase font-black tracking-wider">Cadastro Ativo</span>
                     <span className="text-lg font-extrabold">
                       {apiCards !== null ? (fedToday ? 'Alimentado Hoje' : 'Aguardando Apoio') : 'Alimentado Hoje'}
                     </span>
                  </div>
               </div>
               <p className="text-xs opacity-90 leading-relaxed">
                 {apiCards !== null
                   ? (latestApiCard
                      ? `Seu vale ${apiProviderLabel(latestApiCard.provider)} de R$ ${(latestApiCard.amount / 100).toFixed(2).replace('.', ',')} está liberado abaixo.`
                      : 'Seu cadastro está ativo. Quando um apoiador doar para sua família, o vale aparece aqui automaticamente.')
                   : 'Sua família recebeu o apoio doado pela rede hoje! O código do vale-refeição iFood Alimentação de R$ 40,00 está liberado abaixo.'}
               </p>
            </section>

            {/* ── Solicitação do dia ──
                O pedido vale só para hoje e expira às 08h. Sem ele a família
                não aparece no mapa — por isso o estado precisa ficar explícito,
                e não escondido atrás de um sucesso silencioso. */}
            <section className={`daily-request ${requestedToday ? 'daily-request--done' : ''}`}>
              {requestedToday ? (
                <>
                  <div className="daily-request-head">
                    <Check size={18} className="text-success" aria-hidden="true" />
                    <span className="daily-request-title">Apoio solicitado hoje</span>
                  </div>
                  <p className="daily-request-text">
                    Sua família está visível para os apoiadores. Amanhã será preciso solicitar de novo.
                  </p>
                </>
              ) : (
                <>
                  <div className="daily-request-head">
                    <Clock size={18} className="text-secondary" aria-hidden="true" />
                    <span className="daily-request-title">Precisa de apoio hoje?</span>
                  </div>
                  <p className="daily-request-text">
                    O pedido vale por um dia. Enquanto você não solicitar, sua família não aparece
                    para quem quer ajudar.
                  </p>
                  <Button
                    variant="primary"
                    fullWidth
                    icon={<Heart size={18} />}
                    onClick={handleRequestSupport}
                    disabled={isRequesting}
                    className="mt-3"
                  >
                    {isRequesting ? 'Enviando...' : 'Solicitar apoio de hoje'}
                  </Button>
                </>
              )}
            </section>

            {/* Gift Card Display with QR and copy */}
            <section className="gift-cards-section">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="section-title flex items-center gap-2">
                    <Gift size={18} className="text-secondary" />
                    <span>Vale-Refeição Liberado</span>
                 </h3>
                 <button className="giftcard-change-link" onClick={() => setShowGiftCardSelector(true)}>
                   Alterar vale-alimentação <ChevronRight size={12} />
                 </button>
               </div>

               {apiCards !== null ? (
                 /* ── Vale REAL da API (código decifrado — visível só para o beneficiário) ── */
                 latestApiCard ? (
                   <div className="gift-card-display p-5 bg-white border-2 border-dashed border-secondary rounded-lg text-center flex flex-col items-center">
                      <div className="giftcard-partner-logo mb-2" style={{ background: selectedPartner.color }} aria-hidden="true">
                        {apiProviderLabel(latestApiCard.provider).slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[10px] text-outline block mb-1 uppercase font-bold tracking-wider">
                        Código de Resgate {apiProviderLabel(latestApiCard.provider)} — R$ {(latestApiCard.amount / 100).toFixed(2).replace('.', ',')}
                      </span>

                      <div className="flex items-center gap-2 mb-4 bg-background px-4 py-2 rounded border border-outline-variant">
                        <span className="text-xl font-mono font-black text-primary tracking-wider">{latestApiCard.code}</span>
                        <button
                          className="p-1 hover:text-secondary text-primary transition-all"
                          onClick={() => handleCopyCode(latestApiCard.code)}
                          aria-label="Copiar código"
                        >
                          <Copy size={16} />
                        </button>
                      </div>

                      <div className="flex flex-col items-center p-3 bg-background rounded border border-outline/10 w-full mb-3">
                        <QrCode size={120} className="text-primary mb-2" />
                        <span className="text-[10px] text-outline uppercase font-semibold">Apresente no caixa ou no app</span>
                      </div>

                      <p className="text-[10px] text-outline">
                        {latestApiCard.instructions || 'Use o código acima no app do parceiro.'}
                        {latestApiCard.releasedAt && <> Liberado em: {new Date(latestApiCard.releasedAt).toLocaleDateString('pt-BR')}.</>}
                      </p>

                      {/* Recado de quem apoiou + resposta. Fica junto do vale
                          porque é o momento em que a família abre o app. */}
                      {latestApiCard.donorMessage && (
                        <div className="w-full text-left">
                          <div className="msg-note">
                            <span className="msg-note-label">Mensagem de quem apoiou</span>
                            <p className="msg-note-body">"{latestApiCard.donorMessage.body}"</p>
                          </div>

                          {latestApiCard.myReply ? (
                            <div className="msg-note">
                              <span className="msg-note-label">Você respondeu</span>
                              <p className="msg-note-body">"{latestApiCard.myReply.body}"</p>
                            </div>
                          ) : (
                            latestApiCard.donationId && (
                              <Button
                                variant="outline"
                                fullWidth
                                size="small"
                                className="mt-3"
                                icon={<Heart size={16} />}
                                onClick={() => setReplyToDonationId(latestApiCard.donationId!)}
                              >
                                Agradecer
                              </Button>
                            )
                          )}
                        </div>
                      )}
                   </div>
                 ) : (
                   <div className="p-6 bg-white rounded-lg border border-outline/10 text-center">
                     <Gift size={32} className="text-outline mx-auto mb-2" />
                     <p className="text-sm text-outline">Nenhum vale liberado ainda. Quando uma doação for confirmada, o código aparece aqui.</p>
                   </div>
                 )
               ) : (
               <div className="gift-card-display p-5 bg-white border-2 border-dashed border-secondary rounded-lg text-center flex flex-col items-center">
                  <div className="giftcard-partner-logo mb-2" style={{ background: selectedPartner.color }} aria-hidden="true">
                    {selectedPartner.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[10px] text-outline block mb-1 uppercase font-bold tracking-wider">Código de Resgate {selectedPartner.name}</span>

                  <div className="flex items-center gap-2 mb-4 bg-background px-4 py-2 rounded border border-outline-variant">
                    <span className="text-xl font-mono font-black text-primary tracking-wider">{GIFT_CARD_CODE_PREFIX[giftCardProvider]}-ALIM-9928-2026</span>
                    <button
                      className="p-1 hover:text-secondary text-primary transition-all"
                      onClick={() => handleCopyCode(`${GIFT_CARD_CODE_PREFIX[giftCardProvider]}-ALIM-9928-2026`)}
                      aria-label="Copiar código"
                    >
                      <Copy size={16} />
                    </button>
                  </div>

                  <div className="flex flex-col items-center p-3 bg-background rounded border border-outline/10 w-full mb-3">
                    <QrCode size={120} className="text-primary mb-2" />
                    <span className="text-[10px] text-outline uppercase font-semibold">Apresente no caixa ou no app</span>
                  </div>

                  <p className="text-[10px] text-outline">
                    Disponibilizado em: {new Date().toLocaleDateString('pt-BR')} • Válido por 30 dias.
                  </p>
               </div>
               )}
            </section>

            {/* Receipt History preview */}
            <section className="history-preview">
               <h3 className="section-title mb-3">Recebimentos Anteriores</h3>
               {sortedApiCards !== null ? (
                 /* ── Histórico REAL da API (vales liberados para a família) ── */
                 sortedApiCards.length === 0 ? (
                   <p className="text-xs text-outline text-center py-4 bg-white rounded-lg border border-outline/5 italic">Ainda não há registros de apoios recebidos.</p>
                 ) : (
                   <div className="flex flex-col gap-2">
                      {sortedApiCards.map((card) => (
                        <div key={card.id} className="history-item p-3 bg-white rounded-lg border border-outline/10 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              <Calendar size={16} className="text-outline" />
                              <span className="text-xs font-semibold text-outline">
                                {card.releasedAt ? new Date(card.releasedAt).toLocaleDateString('pt-BR') : '—'}
                                <span className="block text-[10px]">{apiProviderLabel(card.provider)}</span>
                              </span>
                          </div>
                          <span className="text-sm font-extrabold text-success">R$ {(card.amount / 100).toFixed(2).replace('.', ',')}</span>
                        </div>
                      ))}
                   </div>
                 )
               ) : history.length === 0 ? (
                 <p className="text-xs text-outline text-center py-4 bg-white rounded-lg border border-outline/5 italic">Ainda não há registros de apoios recebidos.</p>
               ) : (
                 <div className="flex flex-col gap-2">
                    {history.map((item, i) => (
                      <div key={i} className="history-item p-3 bg-white rounded-lg border border-outline/10 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Calendar size={16} className="text-outline" />
                            <span className="text-xs font-semibold text-outline">
                              {new Date(item.donation.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                        <span className="text-sm font-extrabold text-success">R$ {item.donation.amount}</span>
                      </div>
                    ))}
                 </div>
               )}
            </section>
          </div>
        )}
      </main>

      <InstagramSection showPartners={false} />

      {/* ── Gift card selector modal ── */}
      {showGiftCardSelector && (
        <GiftCardSelectorModal
          selected={giftCardProvider}
          onConfirm={handleGiftCardConfirm}
          onClose={() => setShowGiftCardSelector(false)}
        />
      )}

      {/* Resposta ao doador — mesmas regras do envio: só mensagens prontas. */}
      {replyToDonationId && (
        <MessagePicker
          isOpen
          donationId={replyToDonationId}
          audience="beneficiary"
          title="Agradecer"
          subtitle="Escolha uma mensagem para quem apoiou sua família. Ela verá no histórico de apoios."
          onClose={() => setReplyToDonationId(null)}
          onSent={(body) =>
            setApiCards((prev) =>
              prev
                ? prev.map((c) =>
                    c.donationId === replyToDonationId
                      ? { ...c, myReply: { templateKey: '', body } }
                      : c,
                  )
                : prev,
            )
          }
        />
      )}
    </div>
  );
};

export default BeneficiaryDashboard;
