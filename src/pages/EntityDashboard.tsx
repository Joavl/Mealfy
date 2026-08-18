import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import StoriesRanking from '../components/ui/StoriesRanking';
import InstagramSection from '../components/ui/InstagramSection';
import { useAppContext } from '../context/AppContext';
import { familyService } from '../backend/services/familyService';
import { entityService } from '../backend/services/entityService';
import { normalizeString } from '../backend/utils/normalizeUtils';
import { storage } from '../backend/utils/storage';
import { useToast } from '../context/ToastContext';
import { Users, CirclePlus as PlusCircle, CircleCheck as CheckCircle, Clock, FileText, Check, X, ShieldCheck, ShieldAlert, Mail } from 'lucide-react';
import type { Family, DonorIndication, AuthorizingEntity } from '../backend/types';
import './EntityDashboard.css';

const EntityDashboard: React.FC = () => {
  const { user, stories } = useAppContext();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [families, setFamilies] = useState<Family[]>([]);
  const [indications, setIndications] = useState<DonorIndication[]>([]);
  const [entityData, setEntityData] = useState<AuthorizingEntity | null>(null);
  const [emailLog, setEmailLog] = useState<{ family: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const allFam = await familyService.getFamilies();
    const allInd = await familyService.getIndications();
    
    // Get actual Entity data
    const currentEntity = user?.entityId ? await entityService.getEntityById(user.entityId) : null;
    setEntityData(currentEntity);

    setFamilies(allFam.filter(f => f.authorizingEntityId === user?.entityId || !f.authorizingEntityId));
    
    // Filter pending indications in the region safely
    const pendingInd = allInd.filter(i => {
      if (i.status !== 'pending') return false;
      if (!currentEntity?.region) return true;
      
      const indRegion = normalizeString(i.region);
      const entityRegion = normalizeString(currentEntity.region.split('-')[0]);
      
      return indRegion.includes(entityRegion) || entityRegion.includes(indRegion);
    });
    setIndications(pendingInd);
    setEmailLog(storage.get<{ family: string; date: string }[]>('entity_email_log', []));

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleValidateIndication = async (indId: string, name: string) => {
    try {
      const label = `Validado por ${entityData?.name || user?.name}`;
      await familyService.convertIndicationToFamily(indId, user, label);
      // Registro mockado de e-mail enviado
      const log = storage.get<{ family: string; date: string }[]>('entity_email_log', []);
      log.unshift({ family: name, date: new Date().toISOString() });
      storage.set('entity_email_log', log.slice(0, 30));
      showToast(`Indicação de ${name} validada com sucesso! O e-mail com o código do vale-refeição já foi disparado.`, 'success');
      fetchData(); // Reload lists
    } catch (err) {
      showToast('Ocorreu um erro ao validar indicação.', 'error');
      console.error(err);
    }
  };

  const handleRejectIndication = async (indId: string, name: string) => {
    try {
      await familyService.updateIndicationStatus(indId, 'rejected');
      showToast(`Indicação de ${name} arquivada/recusada.`, 'info');
      fetchData();
    } catch (err) {
      showToast('Erro ao rejeitar a indicação.', 'error');
      console.error(err);
    }
  };

  if (user?.status === 'pending') {
    return (
      <div className="entity-dashboard pending-status p-6 flex flex-col items-center justify-center text-center" style={{ height: '80vh' }}>
        <Clock size={80} className="text-secondary mb-6" />
        <h1 className="text-2xl font-bold mb-2">Cadastro em análise</h1>
        <p className="text-outline">
          Sua entidade está sendo validada por nossa equipe. Em breve você terá acesso ao painel completo.
        </p>
      </div>
    );
  }

  return (
    <div className="entity-dashboard-page">
      <AppHeader title="Painel da Entidade" />

      {/* ── Carrossel de maiores doadores da plataforma ── */}
      <StoriesRanking
        donors={stories}
        currentUser={null}
        onSelectDonor={(donor: any) => { if (!donor.isSorteio) navigate(`/profile/${donor.id}`); }}
      />

      <main className="content p-4">
        {/* ── Header Row ── */}
        <section className="entity-summary mb-5">
           <h2 className="text-xl font-bold text-primary mb-1">Olá, {user?.name}</h2>
           <p className="text-sm text-outline">Gerencie e valide as famílias assistidas na sua região.</p>
        </section>

        {/* ── Stats Grid ── */}
        <section className="stats-grid mb-5">
           <div className="stat-card">
              <Users size={20} className="text-primary mb-2" />
              <span className="stat-value">{families.length}</span>
              <span className="stat-label">Famílias</span>
           </div>
           <div className="stat-card">
              <CheckCircle size={20} className="text-success mb-2" />
              <span className="stat-value">{families.filter(f => f.supportStatus === 'fed').length}</span>
              <span className="stat-label">Alimentadas</span>
           </div>
        </section>

        {/* ── Direct Voucher Informational Banner ── */}
        <section className="info-banner mb-6">
          <div className="info-banner-icon-wrapper">
            <Mail size={18} className="text-primary" />
          </div>
          <div className="info-banner-body">
            <h4 className="info-banner-title">Aviso de Disparo Automático</h4>
            <p className="info-banner-text">
              Após validar uma indicação ou cadastrar uma nova família, o sistema Mealfy envia imediatamente as credenciais de acesso e os códigos de vale-refeição ativos (iFood Alimentação) para o e-mail/WhatsApp do beneficiário.
            </p>
          </div>
        </section>

        {/* ── Core Action ── */}
        <section className="actions-section mb-6">
           <Button 
             variant="primary" 
             fullWidth 
             icon={<PlusCircle size={20} />}
             onClick={() => navigate('/register-family')}
             className="shadow-glow"
           >
             Cadastrar Nova Família
           </Button>
        </section>

        {/* ── Pending Indications Queue ── */}
        <section className="indications-section mb-6">
           <h3 className="section-title mb-4 flex items-center gap-2">
             <FileText size={18} className="text-secondary" />
             Fila de Indicações Recentes
           </h3>
           
           {indications.length === 0 ? (
             <div className="bg-white p-5 rounded-lg border border-outline/10 text-center">
               <p className="text-sm text-outline">Nenhuma indicação de apoiadores aguardando validação.</p>
             </div>
           ) : (
             <div className="flex flex-col gap-3">
               {indications.map((ind, index) => {
                 // Mock check for CadÚnico (alternate items for mock display)
                 const isCadUnicoAuto = index % 2 === 0;
                 return (
                   <div key={ind.id} className="indication-card bg-white p-4 rounded-lg border border-outline/10 shadow-sm">
                     <div className="flex justify-between items-start mb-2">
                       <h4 className="font-bold text-primary">{ind.representativeName}</h4>
                       {isCadUnicoAuto ? (
                         <span className="badge-validation badge-cad-unico">
                           <ShieldCheck size={12} className="mr-1" /> CadÚnico Ativo
                         </span>
                       ) : (
                         <span className="badge-validation badge-manual">
                           Análise Física
                         </span>
                       )}
                     </div>
                     
                     <div className="flex flex-col gap-1 mt-2">
                       <p className="text-xs text-outline"><strong>Região:</strong> {ind.region}</p>
                       <p className="text-xs text-outline"><strong>Crianças Dependentes:</strong> {ind.childrenCount}</p>
                       {ind.contact && <p className="text-xs text-outline"><strong>Contato:</strong> {ind.contact}</p>}
                       <p className="text-xs mt-2 italic text-text-main border-l-2 border-primary/20 pl-2">"{ind.observation}"</p>
                     </div>
                     
                     <div className="flex gap-2 mt-4 pt-3 border-t border-outline/10">
                       <Button 
                         size="small" 
                         className="flex-1 text-xs" 
                         variant="outline"
                         onClick={() => handleRejectIndication(ind.id, ind.representativeName)}
                       >
                         <X size={14} className="mr-1" /> Arquivar
                       </Button>
                       <Button 
                         size="small" 
                         className="flex-1 text-xs" 
                         variant="primary"
                         onClick={() => handleValidateIndication(ind.id, ind.representativeName)}
                       >
                         <Check size={14} className="mr-1" /> Validar e Disparar
                       </Button>
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
        </section>

        {/* ── E-mails automáticos (mock) ── */}
        {emailLog.length > 0 && (
          <section className="email-log-section mb-6">
            <h3 className="section-title mb-3 flex items-center gap-2">
              <Mail size={18} className="text-secondary" /> Credenciais enviadas
            </h3>
            <div className="flex flex-col gap-2">
              {emailLog.slice(0, 6).map((e, i) => (
                <div key={i} className="email-log-item flex items-center justify-between p-3 bg-white rounded-lg border border-outline/10">
                  <span className="text-sm text-text-main">
                    Credenciais enviadas para <strong>{e.family}</strong>
                  </span>
                  <span className="text-[11px] text-outline">
                    {new Date(e.date).toLocaleDateString('pt-BR')} {new Date(e.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Registered Families List ── */}
        <section className="families-list-section">
           <h3 className="section-title mb-4">Famílias Cadastradas</h3>
           {loading ? (
             <div className="text-center py-10">
                <Clock className="animate-spin text-outline mx-auto mb-2" size={24} />
                <p className="text-xs text-outline">Carregando dados...</p>
             </div>
           ) : families.length === 0 ? (
             <div className="empty-state p-10 text-center bg-white rounded-lg border-2 border-dashed border-outline/10">
                <Users size={40} className="text-outline/20 mx-auto mb-4" />
                <p className="text-sm font-bold text-outline mb-1">Nenhuma família cadastrada</p>
                <p className="text-xs text-outline mb-6">Comece cadastrando as famílias atendidas pela sua comunidade.</p>
                <Button variant="outline" size="small" onClick={() => navigate('/register-family')}>
                   Fazer primeiro cadastro
                </Button>
             </div>
           ) : (
             <div className="flex flex-col gap-2">
                {families.map((fam, idx) => {
                  const isCad = idx % 2 === 0;
                  const isGovVerified = idx % 2 === 0;
                  return (
                    <div key={fam.id} className="family-list-item p-4 bg-white rounded-lg border border-outline/10 flex items-center justify-between">
                       <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-primary">{fam.representativeName}</span>
                            {isCad ? (
                              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black">CadÚnico</span>
                            ) : (
                              <span className="text-[9px] bg-outline/10 text-outline px-1.5 py-0.5 rounded font-black">Manual</span>
                            )}
                          </div>
                          <span className="text-xs text-outline mb-1">{fam.neighborhood}</span>
                          {isGovVerified ? (
                            <span className="badge-validation badge-govbr">
                              <ShieldCheck size={12} className="mr-1" /> Verificado via Gov.br
                            </span>
                          ) : (
                            <span className="badge-validation badge-pending">
                              <ShieldAlert size={12} className="mr-1" /> Identidade pendente
                            </span>
                          )}
                       </div>
                       <div className={`status-pill text-[10px] px-2 py-1 rounded font-bold uppercase ${
                         fam.supportStatus === 'fed' || fam.supportStatus === 'supported' 
                           ? 'bg-success/20 text-success' 
                           : 'bg-error/20 text-error'
                       }`}>
                          {fam.supportStatus === 'fed' || fam.supportStatus === 'supported' ? 'Alimentada' : 'Aguardando'}
                       </div>
                    </div>
                  );
                })}
             </div>
           )}
        </section>
      </main>

      <InstagramSection />
    </div>
  );
};

export default EntityDashboard;

