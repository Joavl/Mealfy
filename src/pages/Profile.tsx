import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import RankingDetailsModal from '../components/modals/RankingDetailsModal';
import BottomSheet from '../components/ui/BottomSheet';
import { CreditCard, HelpCircle, Heart, Trophy, MessageCircle, LogOut, Clock, Settings } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { donationService } from '../backend/services/donationService';
import { rankingService } from '../backend/services/rankingService';
import ImpactRegionSelector from '../components/modals/ImpactRegionSelector';
import type { Donation, GiftCard } from '../backend/types';
import { getGiftStatusLabel } from '../lib/ifoodGift';
import './Profile.css';

const Profile: React.FC = () => {
  const { user, logout, updateUserPrivacy } = useAppContext();
  const navigate = useNavigate();
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);
  const [history, setHistory] = useState<{donation: Donation, giftCard: GiftCard}[]>([]);
  const [rankingInfo, setRankingInfo] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="profile-page">
      <AppHeader title="Meu Perfil" rightAction={<Button variant="ghost" onClick={() => setIsSettingsOpen(true)} icon={<Settings size={22} className="text-outline" />} />} />
      
      <main className="content">
        <section className="profile-header p-4 pb-6">
          <div className="avatar-container mb-3">
            <div className="avatar">{user.avatar || user.name.charAt(0)}</div>
            {user.role === 'donor' && (
              <div className="ranking-badge" onClick={() => setIsRankingModalOpen(true)}>
                {rankingInfo ? rankingInfo.rankingPercentile : '...'}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center">
            <h2 className="user-name">{user.name}</h2>
            <div className={`role-badge-pill text-[10px] px-2 py-0.5 rounded-full font-bold uppercase mt-1 mb-1 ${
              user.role === 'donor' ? 'bg-primary/20 text-primary' : 
              user.role === 'entity' ? 'bg-secondary/20 text-secondary' : 
              user.role === 'beneficiary' ? 'bg-success/20 text-success' : 'bg-outline/20 text-outline'
            }`}>
              {user.role === 'donor' ? 'Doador' : user.role === 'entity' ? `Entidade (${user.status || 'pending'})` : user.role === 'beneficiary' ? 'Beneficiário' : 'Admin'}
            </div>
            <p className="user-email text-outline">{user.email || user.phone}</p>
          </div>
        </section>

        {user.role === 'donor' && (
          <section className="impact-summary-container p-4">
            <div 
              className="impact-summary shadow-glow-soft cursor-pointer" 
              onClick={() => setIsRankingModalOpen(true)}
            >
              <div className="impact-item">
                <span className="impact-value">
                  {loading ? '...' : `R$ ${rankingInfo?.totalDonated || 0}`}
                </span>
                <span className="impact-label">Doados</span>
              </div>
              <div className="impact-divider"></div>
              <div className="impact-item">
                <span className="impact-value">
                  {loading ? '...' : history.length}
                </span>
                <span className="impact-label">Créditos iFood</span>
              </div>
              <div className="impact-divider"></div>
              <div className="impact-item">
                <span className="impact-value">
                  {loading ? '...' : `#${rankingInfo?.rankingPosition || '—'}`}
                </span>
                <span className="impact-label">Ranking</span>
              </div>
            </div>
          </section>
        )}

        <section className="quote-section p-4 mb-6">
          <p className="quote-text">
            “Não se iluda: quando você alimenta uma pessoa de verdade, ou estende a mão para cobrir um prato vago, você descobre que esse vazio nunca esteve neles, estava em você.”
          </p>
          <p className="quote-author">— Christiano Montalvão</p>
        </section>

        {user.role === 'donor' && (
          <section className="history-section p-4">
            <div className="section-header flex justify-between items-center mb-4">
              <h3 className="section-title">Minhas doações</h3>
              {history.length > 0 && <Button variant="ghost" size="small" className="text-primary">Ver tudo</Button>}
            </div>
            
            {loading ? (
               <div className="text-center p-8 text-outline text-sm">
                  <Clock className="animate-spin mx-auto mb-2" size={20} />
                  Carregando histórico...
               </div>
            ) : history.length === 0 ? (
               <div className="text-center p-10 bg-surface-highest rounded-2xl border border-outline/5">
                  <Heart size={32} className="text-outline/20 mx-auto mb-3" />
                  <p className="text-sm text-outline mb-4">Você ainda não realizou doações.</p>
                  <Button variant="outline" size="small" onClick={() => navigate('/donate')}>Enviar meu primeiro crédito iFood</Button>
               </div>
            ) : (
              <div className="history-list flex-col gap-3">
                {history.slice(0, 3).map((item, i) => (
                  <div key={i} className="history-card">
                    <div className="history-icon-wrapper">
                      <Heart size={16} className="text-primary" />
                    </div>
                    <div className="history-info">
                      <span className="history-impact">{item.giftCard.label}</span>
                      <span className="history-date text-outline">
                        {new Date(item.donation.createdAt).toLocaleDateString('pt-BR')} • {getGiftStatusLabel(item.giftCard.status)}
                      </span>
                    </div>
                    <div className="history-amount">
                      R$ {item.donation.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="action-menu p-4 flex-col gap-2">
          {user.role === 'donor' && (
            <>
              <Button variant="ghost" className="menu-btn" icon={<CreditCard size={20} />}>Gerenciar Recorrência</Button>
              <Button 
                variant="ghost" 
                className="menu-btn" 
                icon={<Trophy size={20} />} 
                onClick={() => setIsRankingModalOpen(true)}
              >
                Meu Ranking Exclusivo
              </Button>
            </>
          )}
          
          {(user.role === 'donor' || user.role === 'entity') && (
            <Button 
              variant="ghost" 
              className="menu-btn" 
              icon={<Heart size={20} />} 
              onClick={() => navigate(user.role === 'donor' ? '/indicate-family' : '/register-family')}
            >
              {user.role === 'donor' ? 'Indicar Família' : 'Cadastrar Família'}
            </Button>
          )}

          {user.role === 'entity' && (
            <Button 
              variant="ghost" 
              className="menu-btn" 
              icon={<MessageCircle size={20} />} 
              onClick={() => navigate('/entity/dashboard')}
            >
              Ir para Painel da Entidade
            </Button>
          )}

          {user.role === 'beneficiary' && (
            <Button 
              variant="ghost" 
              className="menu-btn" 
              icon={<MessageCircle size={20} />} 
              onClick={() => navigate('/beneficiary/dashboard')}
            >
              Ver Meu Benefício
            </Button>
          )}

          <Button variant="ghost" className="menu-btn" icon={<HelpCircle size={20} />}>Suporte e Ajuda</Button>
        </section>
      </main>

      {rankingInfo && (
        <RankingDetailsModal 
          isOpen={isRankingModalOpen} 
          onClose={() => setIsRankingModalOpen(false)} 
        />
      )}

      <BottomSheet isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Configurações">
         <div className="flex-col gap-4">
           {user.role === 'donor' && (
              <div className="bg-surface-highest rounded-xl border border-outline/10 p-4 flex-col gap-4">
                 <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                       <span className="font-semibold text-sm">Preferência de impacto</span>
                       <span className="text-xs text-outline">
                         {user.impactPreferences?.preferredRegion ? `Em: ${user.impactPreferences.preferredRegion}` : 'Todas as regiões'}
                       </span>
                    </div>
                    <Button variant="ghost" size="small" onClick={() => { setIsSettingsOpen(false); setIsRegionSelectorOpen(true); }} className="text-primary text-xs">
                       Alterar
                    </Button>
                 </div>
                 
                 <div className="flex justify-between items-center border-t border-outline/10 pt-4">
                    <div className="flex flex-col">
                       <span className="font-semibold text-sm">Aparecer no ranking</span>
                       <span className="text-xs text-outline">Seu nome visível para a comunidade</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={user.privacySettings?.showOnRanking} 
                      onChange={(e) => updateUserPrivacy({ showOnRanking: e.target.checked })}
                    />
                 </div>
                 
                 <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                       <span className="font-semibold text-sm">Mostrar Instagram</span>
                       <span className="text-xs text-outline">Link direto para seu perfil social</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={user.privacySettings?.showInstagram} 
                      onChange={(e) => updateUserPrivacy({ showInstagram: e.target.checked })}
                    />
                 </div>
              </div>
           )}

           <div className="bg-surface-highest rounded-xl border border-outline/10 p-4 flex justify-between items-center">
              <div className="flex flex-col">
                 <span className="font-semibold text-sm">Modo Anônimo</span>
                 <span className="text-xs text-outline">Ocultar foto e nome real em tudo</span>
              </div>
              <input 
                type="checkbox" 
                checked={user.privacySettings?.anonymousMode} 
                onChange={(e) => updateUserPrivacy({ anonymousMode: e.target.checked })}
              />
           </div>

           <Button variant="outline" className="border-error text-error mt-4" fullWidth icon={<LogOut size={18} />} onClick={logout}>
              Sair da conta
           </Button>
          </div>
      </BottomSheet>

      <ImpactRegionSelector 
        isOpen={isRegionSelectorOpen} 
        onClose={() => setIsRegionSelectorOpen(false)} 
      />
    </div>
  );
};

export default Profile;
