import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { familyService } from '../backend/services/familyService';
import { entityService } from '../backend/services/entityService';
import { normalizeString } from '../backend/utils/normalizeUtils';
import { Users, PlusCircle, CheckCircle, Clock, AlertCircle, FileText, Check, X } from 'lucide-react';
import type { Family, DonorIndication, AuthorizingEntity } from '../backend/types';
import './EntityDashboard.css';

const EntityDashboard: React.FC = () => {
  const { user } = useAppContext();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [families, setFamilies] = useState<Family[]>([]);
  const [indications, setIndications] = useState<DonorIndication[]>([]);
  const [entityData, setEntityData] = useState<AuthorizingEntity | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const allInd = await familyService.getIndications();
    
    const currentEntity = user?.entityId ? await entityService.getEntityById(user.entityId) : null;
    setEntityData(currentEntity);

    const entityFamilies = user?.entityId
      ? await familyService.getFamiliesForEntity(user.entityId)
      : [];
    setFamilies(entityFamilies);
    
    // Filtrar indicações pendentes pela região de forma segura
    const pendingInd = allInd.filter(i => {
      if (i.status !== 'pending') return false;
      if (!currentEntity?.region) return true;
      
      const indRegion = normalizeString(i.region);
      const entityRegion = normalizeString(currentEntity.region.split('-')[0]);
      
      return indRegion.includes(entityRegion) || entityRegion.includes(indRegion);
    });
    setIndications(pendingInd);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleValidateIndication = async (indId: string) => {
    try {
      const label = `Validado por ${entityData?.name || user?.name}`;
      await familyService.convertIndicationToFamily(indId, user, label);
      showToast('Família validada e cadastrada.', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível validar a indicação.', 'error');
    }
  };

  const handleRejectIndication = async (indId: string) => {
    try {
      await familyService.updateIndicationStatus(indId, 'rejected');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const isPendingEntity = user?.status === 'pending';

  return (
    <div className="entity-dashboard-page">
      <AppHeader title="Painel da Entidade" />
      
      <main className="content p-4">
        {isPendingEntity && (
          <section className="mb-4 p-4 bg-warning/10 border border-warning/30 rounded-xl flex gap-3 items-start">
            <AlertCircle size={22} className="text-warning shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-bold text-primary mb-1">Entidade em análise</p>
              <p className="text-xs text-outline leading-relaxed">
                Você já pode cadastrar famílias; elas ficam com status pendente até a aprovação da entidade.
              </p>
            </div>
          </section>
        )}

        <section className="entity-summary mb-6">
           <h2 className="text-xl font-bold text-primary mb-1">Olá, {user?.name}</h2>
           <p className="text-sm text-outline">Gerencie as famílias assistidas pela sua instituição.</p>
        </section>

        <section className="stats-grid grid grid-cols-2 gap-4 mb-6">
           <div className="stat-card p-4 bg-surface-highest rounded-xl border border-outline/10">
              <Users size={20} className="text-primary mb-2" />
              <span className="text-2xl font-bold">{families.length}</span>
              <span className="text-xs text-outline block">Famílias</span>
           </div>
           <div className="stat-card p-4 bg-surface-highest rounded-xl border border-outline/10">
              <CheckCircle size={20} className="text-success mb-2" />
              <span className="text-2xl font-bold">{families.filter(f => f.supportStatus === 'fed').length}</span>
              <span className="text-xs text-outline block">Alimentadas</span>
           </div>
        </section>

        <section className="actions-section mb-8">
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

        <section className="indications-section mb-8">
           <h3 className="section-title mb-4 flex items-center gap-2">
             <FileText size={18} className="text-secondary" />
             Indicações na sua região
           </h3>
           
           {indications.length === 0 ? (
             <div className="bg-surface-highest p-4 rounded-xl border border-outline/10 text-center">
               <p className="text-sm text-outline">Nenhuma indicação pendente na sua região.</p>
             </div>
           ) : (
             <div className="flex-col gap-3">
               {indications.map(ind => (
                 <div key={ind.id} className="bg-surface p-4 rounded-xl border border-outline/10 shadow-sm">
                   <div className="flex justify-between items-start mb-2">
                     <h4 className="font-bold text-primary">{ind.representativeName}</h4>
                     <span className="text-[10px] font-bold px-2 py-1 bg-warning/20 text-warning uppercase rounded-full">Análise Necessária</span>
                   </div>
                   <p className="text-xs text-outline mb-1"><strong>Região:</strong> {ind.region}</p>
                   <p className="text-xs text-outline mb-1"><strong>Crianças:</strong> {ind.childrenCount}</p>
                   {ind.contact && <p className="text-xs text-outline mb-1"><strong>Contato:</strong> {ind.contact}</p>}
                   <p className="text-xs mt-2 italic text-text-main border-l-2 border-outline/20 pl-2">"{ind.observation}"</p>
                   
                   <div className="flex gap-2 mt-4 pt-3 border-t border-outline/10">
                     <Button 
                       size="small" 
                       className="flex-1 text-xs" 
                       variant="outline"
                       onClick={() => handleRejectIndication(ind.id)}
                     >
                       <X size={14} className="mr-1" /> Recusar
                     </Button>
                     <Button 
                       size="small" 
                       className="flex-1 text-xs" 
                       variant="primary"
                       onClick={() => handleValidateIndication(ind.id)}
                     >
                       <Check size={14} className="mr-1" /> Validar e cadastrar
                     </Button>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </section>

        <section className="families-list-section">
           <h3 className="section-title mb-4">Minhas Famílias</h3>
           {loading ? (
             <div className="text-center py-10">
                <Clock className="animate-spin text-outline mx-auto mb-2" size={24} />
                <p className="text-xs text-outline">Carregando dados...</p>
             </div>
           ) : families.length === 0 ? (
             <div className="empty-state p-10 text-center bg-surface-highest rounded-2xl border-2 border-dashed border-outline/10">
                <Users size={40} className="text-outline/20 mx-auto mb-4" />
                <p className="text-sm font-bold text-outline mb-1">Nenhuma família cadastrada</p>
                <p className="text-xs text-outline mb-6">Comece indicando as famílias da sua comunidade que precisam de apoio.</p>
                <Button variant="outline" size="small" onClick={() => navigate('/register-family')}>
                   Fazer primeiro cadastro
                </Button>
             </div>
           ) : (
             <div className="flex-col gap-3">
                {families.map(fam => (
                  <div key={fam.id} className="family-list-item p-4 bg-surface rounded-xl border border-outline/10 flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="font-bold text-sm">{fam.representativeName}</span>
                        <span className="text-xs text-outline">{fam.neighborhood}</span>
                     </div>
                     <div className={`status-pill text-[10px] px-2 py-1 rounded-full font-bold uppercase ${fam.supportStatus === 'fed' ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
                        {fam.supportStatus === 'fed' ? 'Alimentada' : 'Pendente'}
                     </div>
                  </div>
                ))}
             </div>
           )}
        </section>
      </main>
    </div>
  );
};

export default EntityDashboard;
