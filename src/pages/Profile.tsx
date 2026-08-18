import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import BottomSheet from '../components/ui/BottomSheet';
import { CreditCard, HelpCircle, Heart, Trophy, MessageCircle, LogOut, Clock, Settings, QrCode, Share2, Award, User as UserIcon, AtSign, Lock, Camera, Trash2, ShieldCheck } from 'lucide-react';
import { isImageSrc, fileToAvatarDataUrl } from '../utils/image';
import { useAppContext } from '../context/AppContext';
import { usersApi } from '../api/usersApi';
import { donationService } from '../backend/services/donationService';
import { rankingService } from '../backend/services/rankingService';
import { getDonorById } from '../backend/mockData/users';
import ImpactRegionSelector from '../components/modals/ImpactRegionSelector';
import { useToast } from '../context/ToastContext';
import './Profile.css';

interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  unlocked: boolean;
}

const DONATION_STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Aguardando pagamento',
  gift_card_purchase_pending: 'Emitindo vale',
  completed: 'Vale liberado',
  manual_review: 'Em revisão',
  failed: 'Não concluído',
  canceled: 'Cancelado',
};

/**
 * Texto de progresso de um apoio no histórico.
 *
 * O vale pode não existir: o DTO do doador nunca traz o código (por design) e,
 * enquanto o pagamento não confirma, não há vale nenhum. Nesses casos o estado
 * da DOAÇÃO é o que informa o doador.
 */
function describeDonationProgress(item: { donation: any; giftCard: { status?: string } | null }): string {
  if (item.giftCard?.status) {
    return item.giftCard.status === 'redeemed' ? 'Resgatado' : 'Disponibilizado';
  }
  return DONATION_STATUS_LABEL[item.donation?.status] ?? 'Em andamento';
}

const Profile: React.FC = () => {
  const { user, logout, updateUserPrivacy, updateUserProfile, selectedRegion } = useAppContext();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();
  const { showToast } = useToast();

  const [history, setHistory] = useState<any[]>([]);
  const [rankingInfo, setRankingInfo] = useState<any>(null);

  // Sheet and Modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);

  // Exclusão de conta (Play Store/LGPD): confirmação em duas etapas
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await usersApi.deleteMe();
      showToast('Conta excluída. Sentiremos sua falta!', 'info');
      setIsDeleteConfirmOpen(false);
      setIsSettingsOpen(false);
      logout();
      navigate('/auth');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível excluir a conta agora.', 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const [loading, setLoading] = useState(true);

  // Mensagem Pessoal (bio) — texto local do textarea de configurações
  const [personalMessageDraft, setPersonalMessageDraft] = useState(user?.personalMessage || '');

  useEffect(() => {
    setPersonalMessageDraft(user?.personalMessage || '');
  }, [user?.personalMessage]);

  // ── Foto de perfil ──
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  // ── Instagram: rascunho do handle digitado quando ainda não conectado ──
  const [instagramDraft, setInstagramDraft] = useState('');

  // Load user data & history
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      try {
        if (user.role === 'donor') {
          const [histResponse, rankResponse] = await Promise.all([
            donationService.getDonationHistoryByUser(user.id),
            rankingService.getUserRanking(user.id)
          ]);
          setHistory(histResponse);
          setRankingInfo(rankResponse);
        } else {
          setHistory([]);
          setRankingInfo(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [user]);

  if (!user) return null;

  // ── Modo de visualização: perfil próprio vs. perfil de terceiros (/profile/:id) ──
  const isOwnProfile = !routeId || routeId === user.id;
  const viewedDonor = !isOwnProfile ? getDonorById(routeId!) : null;

  if (!isOwnProfile && !viewedDonor) {
    return (
      <div className="profile-page">
        <AppHeader title="Perfil" showBack />
        <main className="content">
          <div className="text-center p-10 text-outline text-sm">
            Este perfil não foi encontrado.
          </div>
        </main>
      </div>
    );
  }

  // Helper values — usuário zerado (sem apoios) deve refletir 0 em todos os indicadores
  const totalSpent = rankingInfo?.totalDonated ?? 0;
  const rankPos = rankingInfo?.rankingPosition ?? 0;
  const supportsCount = history.length;
  const focusRegion = selectedRegion || 'Heliópolis';

  // Níveis de evolução com base na quantidade de apoios realizados
  const LEVELS = [
    { threshold: 0, name: 'Iniciante', next: 1 },
    { threshold: 1, name: 'Nível 1: Primeiros Passos', next: 3 },
    { threshold: 3, name: 'Nível 2: Apoiador Frequente', next: 6 },
    { threshold: 6, name: 'Nível 3: Guardião Alimentar', next: 10 },
    { threshold: 10, name: 'Nível 4: Guardião Alimentar Sênior', next: null as number | null },
  ];
  const levelInfo = (() => {
    let current = LEVELS[0];
    for (const lvl of LEVELS) {
      if (supportsCount >= lvl.threshold) current = lvl;
    }
    const total = current.next !== null ? current.next - current.threshold : 0;
    const progress = current.next !== null ? supportsCount - current.threshold : 0;
    return { name: current.name, progress, total, isMaxLevel: current.next === null };
  })();
  const currentLevel = levelInfo.name;
  const nextLevelProgress = levelInfo.progress;
  const nextLevelTotal = levelInfo.total;

  // Mock Achievements badges list — estado "desbloqueado" calculado a partir do progresso real do usuário
  const badges: Badge[] = [
    { id: 'b1', name: 'Pioneiro', desc: 'Realizou o primeiro apoio', icon: <Award size={20} />, unlocked: supportsCount >= 1 },
    { id: 'b2', name: 'Guardião Regional', desc: 'Apoiou famílias na sua região de foco', icon: <Award size={20} />, unlocked: supportsCount >= 2 },
    { id: 'b3', name: 'Multiplicador', desc: 'Apoiou 5 ou mais famílias', icon: <Award size={20} />, unlocked: supportsCount >= 5 },
    { id: 'b4', name: 'Lacre de Ouro', desc: 'Apoiou a tecnologia Mealfy com R$ 50 ou mais', icon: <Award size={20} />, unlocked: totalSpent >= 50 },
    { id: 'b5', name: 'Líder de Rede', desc: 'Completou 10 apoios ativos', icon: <Award size={20} />, unlocked: supportsCount >= 10 },
    { id: 'b6', name: 'Mealfy Champion', desc: 'Alcançou o top 10 do ranking', icon: <Award size={20} />, unlocked: rankPos > 0 && rankPos <= 10 },
  ];
  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  // ── Dados unificados para exibição (próprio perfil ou perfil de terceiros) ──
  const isAnonymousView = isOwnProfile ? !!user.privacySettings?.anonymousMode : !!viewedDonor?.isAnonymous;
  const displayName = isAnonymousView ? 'Apoiador Anônimo' : (isOwnProfile ? user.name : viewedDonor!.name);
  const displayAvatar = isOwnProfile ? user.avatar : viewedDonor!.avatar;
  const displayInstagram = isOwnProfile ? user.instagram : viewedDonor!.instagram;
  const showInstagram = isOwnProfile ? !!user.privacySettings?.showInstagram : !!viewedDonor!.privacySettings?.showInstagram;
  const displayPersonalMessage = isOwnProfile ? user.personalMessage : viewedDonor!.personalMessage;
  const displayTotalDonated = isOwnProfile ? totalSpent : viewedDonor!.totalDonated;
  const displaySupportsCount = isOwnProfile ? supportsCount : (viewedDonor!.supportsCount ?? 0);
  const displayFocusRegion = isOwnProfile ? focusRegion : viewedDonor!.focusRegion;
  const displayLevel = isOwnProfile ? currentLevel : 'Apoiador Mealfy';
  const showFichaPublica = isOwnProfile ? user.role === 'donor' : true;

  const handleSharePublicCard = () => {
    const username = isAnonymousView ? 'apoiador-anonimo' : displayName.toLowerCase().replace(/\s+/g, '-');
    const url = `https://mealfy.app/p/${username}`;
    navigator.clipboard.writeText(url);
    showToast('Link da Ficha Pública copiado para a área de transferência!', 'success');
  };

  const handleSavePersonalMessage = (value: string) => {
    setPersonalMessageDraft(value);
    updateUserProfile({ personalMessage: value });
  };

  // ── Foto de perfil ──
  const handlePhotoPick = () => photoInputRef.current?.click();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-selecionar o mesmo arquivo
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await updateUserProfile({ avatar: dataUrl });
      showToast('Foto de perfil atualizada!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível usar essa imagem.', 'error');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    await updateUserProfile({ avatar: undefined });
    showToast('Foto de perfil removida.', 'info');
  };

  // ── Instagram (handle real digitado pelo usuário) ──
  const normalizeHandle = (raw: string): string => {
    // Aceita "@nome", "nome" ou uma URL do instagram; devolve "@nome" limpo.
    const fromUrl = raw.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
    const cleaned = fromUrl.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase();
    return cleaned ? `@${cleaned}` : '';
  };

  const handleConnectInstagram = () => {
    const handle = normalizeHandle(instagramDraft);
    if (handle.length < 3) {
      showToast('Digite um @ de usuário válido do Instagram.', 'error');
      return;
    }
    // Uma única atualização: chamar updateUserProfile e updateUserPrivacy em
    // sequência leria o mesmo `user` do closure e o segundo setUser sobrescreveria
    // o primeiro (perdendo o instagram). Por isso mesclamos tudo aqui.
    updateUserProfile({
      instagram: handle,
      privacySettings: {
        showOnRanking: false,
        anonymousMode: false,
        ...user.privacySettings,
        showInstagram: true,
      },
    });
    setInstagramDraft('');
    showToast('Instagram conectado!', 'success');
  };

  const handleDisconnectInstagram = () => {
    updateUserProfile({ instagram: undefined });
    showToast('Instagram desconectado.', 'info');
  };

  return (
    <div className="profile-page">
      <AppHeader
        title={isOwnProfile ? 'Meu Perfil' : displayName}
        showBack={!isOwnProfile}
        rightAction={
          isOwnProfile ? (
            <Button
              variant="ghost"
              onClick={() => setIsSettingsOpen(true)}
              icon={<Settings size={22} className="text-outline" />}
            />
          ) : undefined
        }
      />

      <main className="content">
        {/* ── Profile Header ── */}
        <section className="profile-header">
          <div className="avatar-container mb-3">
            <div className="avatar">
              {isAnonymousView ? (
                <UserIcon size={32} />
              ) : isImageSrc(displayAvatar) ? (
                <img src={displayAvatar} alt={displayName} />
              ) : (
                displayAvatar || displayName.charAt(0)
              )}
            </div>
            {isOwnProfile && user.role === 'donor' && (
              <div className="ranking-badge" onClick={() => setIsAchievementsModalOpen(true)}>
                {currentLevel.split(':')[0]}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center">
            <h2 className="user-name">
              {displayName}
            </h2>
            <div className={`role-badge-pill text-[10px] px-2 py-0.5 rounded-full font-bold uppercase mt-1 mb-1 ${
              isOwnProfile
                ? (user.role === 'donor' ? 'bg-primary/20 text-primary' :
                   user.role === 'entity' ? 'bg-secondary/20 text-secondary' :
                   user.role === 'beneficiary' ? 'bg-success/20 text-success' : 'bg-outline/20 text-outline')
                : 'bg-primary/20 text-primary'
            }`}>
              {isOwnProfile
                ? (user.role === 'donor' ? 'Apoiador' : user.role === 'entity' ? `Entidade (${user.status || 'pending'})` : user.role === 'beneficiary' ? 'Beneficiário' : 'Admin')
                : 'Apoiador'}
            </div>
            {isOwnProfile && (
              <p className="user-email text-outline">{user.email || user.phone}</p>
            )}
          </div>
        </section>

        {/* ── Impact Summary ── */}
        {(isOwnProfile ? user.role === 'donor' : true) && (
          <section className="impact-summary-container">
            <div className="impact-summary shadow-glow-soft">
              <div className="impact-item">
                <span className="impact-value">
                  R$ {displayTotalDonated}
                </span>
                <span className="impact-label">Apoiado</span>
              </div>
              <div className="impact-divider"></div>
              <div className="impact-item">
                <span className="impact-value">
                  {displaySupportsCount}
                </span>
                <span className="impact-label">Refeições</span>
              </div>
              <div className="impact-divider"></div>
              <div className="impact-item">
                <span className="impact-value">
                  {isOwnProfile
                    ? (rankPos > 0 ? `#${rankPos}` : '—')
                    : `#${viewedDonor!.rankingPosition}`}
                </span>
                <span className="impact-label">Ranking</span>
              </div>
            </div>
          </section>
        )}

        {/* ── Achievements Card (Own Donor Profile Only) ── */}
        {isOwnProfile && user.role === 'donor' && (
          <section 
            className="achievement-card"
            onClick={() => setIsAchievementsModalOpen(true)}
          >
            <div className="achievement-header">
              <span className="achievement-title">Sua Evolução Alimentar</span>
              <span className="achievement-level">{currentLevel}</span>
            </div>
            <div className="achievement-progress-container">
              <div
                className="achievement-progress-bar"
                style={{ width: `${levelInfo.isMaxLevel ? 100 : (nextLevelProgress / nextLevelTotal) * 100}%` }}
              ></div>
            </div>
            <div className="achievement-footer flex justify-between">
              {supportsCount === 0 ? (
                <span>Complete seu primeiro apoio para desbloquear sua primeira insígnia!</span>
              ) : levelInfo.isMaxLevel ? (
                <span>Nível máximo alcançado!</span>
              ) : (
                <span>{nextLevelProgress} de {nextLevelTotal} apoios concluídos</span>
              )}
              <span className="font-bold text-primary whitespace-nowrap">Ver insígnias ›</span>
            </div>
          </section>
        )}

        {/* ── Wikipedia-style Infobox Card ── */}
        {showFichaPublica && (
          <section className="wikipedia-infobox-container">
            <h3 className="infobox-title">Ficha Pública de Impacto</h3>

            <table className="infobox-table">
              <tbody>
                <tr className="infobox-row">
                  <td className="infobox-label">Apoiador</td>
                  <td className="infobox-value">
                    {displayName}
                  </td>
                </tr>
                <tr className="infobox-row">
                  <td className="infobox-label">Patente</td>
                  <td className="infobox-value">{displayLevel}</td>
                </tr>
                {displayFocusRegion && (
                  <tr className="infobox-row">
                    <td className="infobox-label">Foco Regional</td>
                    <td className="infobox-value">{displayFocusRegion}</td>
                  </tr>
                )}
                <tr className="infobox-row">
                  <td className="infobox-label">Impacto Estimado</td>
                  <td className="infobox-value">{displaySupportsCount * 4} crianças nutridas</td>
                </tr>
                {!isAnonymousView && showInstagram && displayInstagram && (
                  <tr className="infobox-row">
                    <td className="infobox-label">Rede Social</td>
                    <td className="infobox-value">
                      <a
                        href={`https://instagram.com/${displayInstagram.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="infobox-instagram-chip"
                      >
                        <AtSign size={14} /> {displayInstagram.replace(/^@/, '')}
                      </a>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {!isAnonymousView && displayPersonalMessage && (
              <div className="infobox-mission">
                <span className="infobox-mission-title">Minha Missão</span>
                <p className="infobox-mission-text">“{displayPersonalMessage}”</p>
              </div>
            )}

            <div className="infobox-qr-wrapper">
              <QrCode size={110} className="text-primary" />
              <span className="infobox-qr-label">Escanear Ficha de Apoiador</span>
            </div>

            <Button
              variant="outline"
              fullWidth
              size="small"
              icon={<Share2 size={16} />}
              onClick={handleSharePublicCard}
            >
              Compartilhar Ficha Pública
            </Button>
          </section>
        )}

        {/* ── Custom Quote (Own Profile Only) ── */}
        {isOwnProfile && (
          <section className="quote-section">
            <p className="quote-text">
              “Não se iluda: quando você alimenta uma pessoa de verdade, ou estende a mão para cobrir um prato vago, você descobre que esse vazio nunca esteve neles, estava em você.”
            </p>
            <p className="quote-author">— Christiano Mealfy</p>
          </section>
        )}

        {/* ── Support History (Own Donor Profile Only) ── */}
        {isOwnProfile && user.role === 'donor' && (
          <section className="history-section">
            <h3 className="section-title mb-3">Histórico de Apoios</h3>
            
            {loading ? (
               <div className="text-center p-8 text-outline text-sm">
                  <Clock className="animate-spin mx-auto mb-2 text-primary" size={20} />
                  Carregando histórico...
               </div>
            ) : history.length === 0 ? (
               <div className="text-center p-10 bg-white rounded-md border border-outline/5">
                  <Heart size={32} className="text-outline/20 mx-auto mb-3" />
                  <p className="text-sm text-outline mb-4">Você ainda não realizou apoios.</p>
                  <Button variant="outline" size="small" onClick={() => navigate('/donate')}>Realizar meu primeiro apoio</Button>
               </div>
            ) : (
              <div className="history-list flex flex-col gap-2">
                {history.slice(0, 3).map((item, i) => {
                  const d = item.donation as any;
                  return (
                    <div key={i}>
                      <div className="history-card">
                        <div className="history-icon-wrapper">
                          <Heart size={16} className="text-primary" />
                        </div>
                        <div className="history-info">
                          <span className="history-impact">
                            {item.giftCard?.label || d.providerLabel || 'Apoio Alimentar Coletivo'}
                          </span>
                          <span className="history-date text-outline">
                            {new Date(item.donation.createdAt).toLocaleDateString('pt-BR')} • {describeDonationProgress(item)}
                          </span>
                        </div>
                        <div className="history-amount">
                          R$ {item.donation.amount}
                        </div>
                      </div>

                      {/* Resposta da família — só aparece quando ela de fato respondeu. */}
                      {d.receivedMessage && (
                        <div className="msg-note">
                          <span className="msg-note-label">Resposta da família</span>
                          <p className="msg-note-body">"{d.receivedMessage.body}"</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Actions Menu (Own Profile Only) ── */}
        {isOwnProfile && (
        <section className="action-menu">
          {user.role === 'donor' && (
            <>
              <Button 
                variant="ghost" 
                className="menu-btn" 
                icon={<CreditCard size={20} className="text-outline" />}
                onClick={() => navigate('/recurrence')}
              >
                Gerenciar Apoios Recorrentes
              </Button>
              <Button 
                variant="ghost" 
                className="menu-btn" 
                icon={<Trophy size={20} className="text-outline" />} 
                onClick={() => setIsAchievementsModalOpen(true)}
              >
                Meu Ranking e Medalhas
              </Button>
            </>
          )}
          
          {(user.role === 'donor' || user.role === 'entity') && (
            <Button 
              variant="ghost" 
              className="menu-btn" 
              icon={<Heart size={20} className="text-outline" />} 
              onClick={() => navigate(user.role === 'donor' ? '/indicate-family' : '/register-family')}
            >
              {user.role === 'donor' ? 'Indicar Família para Apoio' : 'Cadastrar Família Beneficiária'}
            </Button>
          )}

          {user.role === 'entity' && (
            <Button 
              variant="ghost" 
              className="menu-btn" 
              icon={<MessageCircle size={20} className="text-outline" />} 
              onClick={() => navigate('/entity/dashboard')}
            >
              Ir para Painel da Entidade
            </Button>
          )}

          {user.role === 'beneficiary' && (
            <Button 
              variant="ghost" 
              className="menu-btn" 
              icon={<MessageCircle size={20} className="text-outline" />} 
              onClick={() => navigate('/beneficiary/dashboard')}
            >
              Ver Meus Vale-Refeições Ativos
            </Button>
          )}

          <Button 
            variant="ghost" 
            className="menu-btn" 
            icon={<HelpCircle size={20} className="text-outline" />}
            onClick={() => navigate('/help')}
          >
            Suporte e Ajuda
          </Button>
        </section>
        )}
      </main>

      {/* ── Settings BottomSheet ── */}
      <BottomSheet isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Configurações da Conta">
         <div className="flex flex-col gap-4">
           {/* ── Foto de perfil (todos os papéis) ── */}
           <div className="bg-surface-highest/60 rounded-lg border border-outline/10 p-4 flex items-center gap-4">
              <div className="settings-avatar bg-primary/15 text-primary">
                 {isImageSrc(user.avatar)
                   ? <img src={user.avatar} alt="Sua foto de perfil" />
                   : (user.name?.charAt(0) || 'U')}
              </div>
              <div className="flex flex-col flex-1 gap-2">
                 <span className="font-semibold text-sm">Foto de perfil</span>
                 <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="primary"
                      size="small"
                      className="shrink-0 whitespace-nowrap"
                      icon={<Camera size={16} />}
                      onClick={handlePhotoPick}
                      disabled={isProcessingPhoto}
                    >
                      {isProcessingPhoto ? 'Processando...' : (isImageSrc(user.avatar) ? 'Trocar foto' : 'Adicionar foto')}
                    </Button>
                    {isImageSrc(user.avatar) && (
                      <Button
                        variant="ghost"
                        size="small"
                        className="text-error shrink-0 whitespace-nowrap"
                        icon={<Trash2 size={16} />}
                        onClick={handleRemovePhoto}
                        disabled={isProcessingPhoto}
                      >
                        Remover
                      </Button>
                    )}
                 </div>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
           </div>

           {user.role === 'donor' && (
              <div className="bg-surface-highest/60 rounded-lg border border-outline/10 p-4 flex flex-col gap-4">
                 <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                       <span className="font-semibold text-sm">Região preferencial de apoio</span>
                       <span className="text-xs text-outline">{focusRegion}</span>
                    </div>
                    <Button variant="ghost" size="small" onClick={() => { setIsSettingsOpen(false); setTimeout(() => setIsRegionSelectorOpen(true), 360); }} className="text-primary text-xs">
                       Alterar
                    </Button>
                 </div>
                 
                 <div className="flex justify-between items-center border-t border-outline/10 pt-4">
                    <div className="flex flex-col">
                       <span className="font-semibold text-sm">Exibir no Ranking Público</span>
                       <span className="text-xs text-outline">Seu nome e impacto ficam visíveis na rede</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={user.privacySettings?.showOnRanking} 
                      onChange={(e) => updateUserPrivacy({ showOnRanking: e.target.checked })}
                    />
                 </div>
                 
                 {/* Conectar Instagram — handle digitado pelo usuário (separado da visibilidade) */}
                 <div className="flex flex-col gap-2 border-t border-outline/10 pt-4">
                    <div className="flex items-center gap-2">
                       <AtSign size={16} className="text-outline" />
                       <span className="font-semibold text-sm">Instagram</span>
                    </div>
                    {user.instagram ? (
                      <div className="flex justify-between items-center gap-2">
                         <span className="text-xs text-outline truncate">
                           Conectado: <strong className="text-primary">{user.instagram}</strong>
                         </span>
                         <Button variant="outline" size="small" onClick={handleDisconnectInstagram}>
                           Desconectar
                         </Button>
                      </div>
                    ) : (
                      <>
                         <span className="text-xs text-outline">Conecte seu @ para ganhar destaque na sua ficha pública.</span>
                         <div className="flex gap-2 items-center">
                            <div className="flex items-center flex-1 bg-white border border-outline/20 rounded-lg px-3">
                               <span className="text-outline text-sm">@</span>
                               <input
                                 className="flex-1 py-2 pl-1 bg-transparent outline-none text-sm"
                                 placeholder="seu.usuario"
                                 value={instagramDraft.replace(/^@/, '')}
                                 onChange={(e) => setInstagramDraft(e.target.value)}
                                 onKeyDown={(e) => { if (e.key === 'Enter') handleConnectInstagram(); }}
                                 autoCapitalize="none"
                                 autoCorrect="off"
                                 aria-label="Nome de usuário do Instagram"
                               />
                            </div>
                            <Button variant="primary" size="small" onClick={handleConnectInstagram}>
                              Conectar
                            </Button>
                         </div>
                      </>
                    )}
                 </div>

                 <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                       <span className="font-semibold text-sm">Mostrar link do Instagram</span>
                       <span className="text-xs text-outline">Exibe link do seu perfil na ficha pública</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={user.privacySettings?.showInstagram}
                      onChange={(e) => updateUserPrivacy({ showInstagram: e.target.checked })}
                    />
                 </div>

                 <div className="flex flex-col gap-2 border-t border-outline/10 pt-4">
                    <div className="flex justify-between items-center">
                       <span className="font-semibold text-sm">Minha Missão</span>
                       <span className="text-xs text-outline">{personalMessageDraft.length}/180</span>
                    </div>
                    <span className="text-xs text-outline">Por que você ajuda a combater a fome? Exibido na sua Ficha Pública de Impacto.</span>
                    <textarea
                      className="form-input"
                      rows={3}
                      maxLength={180}
                      placeholder="Ex: Acredito que pequenos apoios constantes mudam a vida de uma família inteira..."
                      value={personalMessageDraft}
                      onChange={(e) => handleSavePersonalMessage(e.target.value)}
                    />
                 </div>
              </div>
           )}

           <div className="bg-surface-highest/60 rounded-lg border border-outline/10 p-4 flex justify-between items-center">
              <div className="flex flex-col">
                 <span className="font-semibold text-sm">Modo Anônimo</span>
                 <span className="text-xs text-outline">Oculta foto e nome real na plataforma</span>
              </div>
              <input 
                type="checkbox" 
                checked={user.privacySettings?.anonymousMode} 
                onChange={(e) => updateUserPrivacy({ anonymousMode: e.target.checked })}
              />
           </div>

           <Button
             variant="ghost"
             className="menu-btn mt-2"
             icon={<ShieldCheck size={20} className="text-outline" />}
             onClick={() => { setIsSettingsOpen(false); navigate('/privacy'); }}
           >
             Política de Privacidade
           </Button>

           <Button variant="outline" className="border-error text-error mt-4" fullWidth icon={<LogOut size={18} />} onClick={logout}>
              Sair da conta
           </Button>

           {/* ── Zona de perigo: exclusão definitiva da conta (Play Store/LGPD) ── */}
           <div className="mt-2 pt-4 border-t border-error/15">
              {!isDeleteConfirmOpen ? (
                <Button
                  variant="ghost"
                  fullWidth
                  className="text-error/80 text-xs"
                  icon={<Trash2 size={16} />}
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  Excluir minha conta
                </Button>
              ) : (
                <div className="bg-error/5 border border-error/20 rounded-lg p-4 flex flex-col gap-3">
                  <span className="font-semibold text-sm text-error">Excluir conta definitivamente?</span>
                  <p className="text-xs text-outline">
                    Seus dados de perfil, histórico de apoios e preferências serão removidos. Essa ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="small"
                      fullWidth
                      onClick={() => setIsDeleteConfirmOpen(false)}
                      disabled={isDeletingAccount}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      size="small"
                      fullWidth
                      className="bg-error border-error"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                    >
                      {isDeletingAccount ? 'Excluindo...' : 'Sim, excluir'}
                    </Button>
                  </div>
                </div>
              )}
           </div>
          </div>
      </BottomSheet>

      {/* ── Custom Achievements Modal ── */}
      {isAchievementsModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4 blur-bg">
          <div className="bg-white max-w-sm w-full p-6 border border-outline/10 rounded-lg relative">
            <h3 className="font-bold text-lg text-primary mb-2 flex items-center gap-2">
              <Trophy className="text-secondary" size={22} />
              Suas Medalhas de Impacto
            </h3>
            <p className="text-xs text-outline mb-4">Apoie mais famílias para desbloquear patentes e engajar a comunidade.</p>

            {unlockedBadgesCount === 0 && (
              <div className="badge-empty-hint mb-4">
                Complete seu primeiro apoio para desbloquear sua primeira insígnia!
              </div>
            )}

            <div className="badge-grid mb-6">
              {badges.map((b) => (
                <div key={b.id} className={`badge-item ${b.unlocked ? '' : 'locked'}`} title={b.desc}>
                  <div className="badge-icon-container">
                    {b.unlocked ? b.icon : <Lock size={20} />}
                  </div>
                  <span className="badge-name">{b.name}</span>
                  <span className="badge-desc">{b.unlocked ? 'Desbloqueado' : b.desc}</span>
                </div>
              ))}
            </div>

            <Button 
              variant="primary" 
              fullWidth 
              onClick={() => setIsAchievementsModalOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      {/* Impact region selector modal */}
      <ImpactRegionSelector 
        isOpen={isRegionSelectorOpen} 
        onClose={() => setIsRegionSelectorOpen(false)} 
      />
    </div>
  );
};

export default Profile;
