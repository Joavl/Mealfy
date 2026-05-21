import React from 'react';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck, Building2, FileText, RefreshCw, Star } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { familyService } from '../backend/services/familyService';
import { adminService } from '../backend/services/adminService';
import type { DonorIndication } from '../backend/types';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [pendingEntitiesCount, setPendingEntitiesCount] = React.useState(0);
  const [pendingFamiliesCount, setPendingFamiliesCount] = React.useState(0);
  const [pendingIndications, setPendingIndications] = React.useState<DonorIndication[]>([]);

  const refreshCounts = async () => {
    const pendingEntities = await adminService.getPendingEntities();
    setPendingEntitiesCount(pendingEntities.length);
    
    const families = JSON.parse(localStorage.getItem('families_db') || '[]');
    setPendingFamiliesCount(families.filter((f: any) => f.status === 'pending').length);
    
    const inds = await familyService.getIndications();
    setPendingIndications(inds.filter(i => i.status === 'pending'));
  };

  React.useEffect(() => {
    refreshCounts();
  }, []);

  const handleApproveIndication = async (id: string) => {
    try {
      await familyService.updateIndicationStatus(id, 'approved');
      showToast("Indicação aprovada (disponível para entidades verem)", "success");
      refreshCounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectIndication = async (id: string) => {
    try {
      await familyService.updateIndicationStatus(id, 'rejected');
      showToast("Indicação rejeitada.", "success");
      refreshCounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertIndication = async (id: string) => {
    try {
      await familyService.convertIndicationToFamily(id, { name: 'Admin Mealfy' }, 'Validado por Admin Mealfy');
      showToast("Indicação convertida em família com sucesso!", "success");
      refreshCounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleForwardIndication = () => {
    showToast("Indicação encaminhada para a entidade da região com sucesso!", "success");
  };

  return (
    <div className="admin-dashboard-page">
      <AppHeader title="Painel Administrativo" />
      
      <main className="content p-4">
        <section className="admin-header mb-6 flex items-center gap-3">
           <div className="bg-primary/10 p-3 rounded-full text-primary">
              <ShieldCheck size={32} />
           </div>
           <div>
              <h2 className="text-xl font-bold">Administração</h2>
              <p className="text-xs text-outline">Controle e moderação da plataforma.</p>
           </div>
        </section>

        <section className="admin-menu grid grid-cols-1 gap-3 mb-8">
           <div className="admin-menu-item p-4 bg-surface-highest rounded-xl border border-outline/10 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                 <Building2 size={20} className="text-secondary" />
                 <span className="font-bold text-sm">Entidades Pendentes</span>
              </div>
              {pendingEntitiesCount > 0 ? (
                <span className="bg-error text-inverted text-[10px] px-2 py-0.5 rounded-full">{pendingEntitiesCount}</span>
              ) : (
                <span className="text-[10px] text-outline">Nenhuma</span>
              )}
           </div>
           
           <div className="admin-menu-item p-4 bg-surface-highest rounded-xl border border-outline/10 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                 <FileText size={20} className="text-primary" />
                 <span className="font-bold text-sm">Famílias Oficiais Pendentes</span>
              </div>
              {pendingFamiliesCount > 0 ? (
                <span className="bg-error text-inverted text-[10px] px-2 py-0.5 rounded-full">{pendingFamiliesCount}</span>
              ) : (
                <span className="text-[10px] text-outline">Nenhuma</span>
              )}
           </div>

           <div
             className="admin-menu-item p-4 bg-surface-highest rounded-xl border border-outline/10 flex items-center justify-between cursor-pointer"
             onClick={() => navigate('/admin/featured-donors')}
             onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/featured-donors')}
             role="button"
             tabIndex={0}
           >
              <div className="flex items-center gap-3">
                 <Star size={20} className="text-secondary" />
                 <div>
                   <span className="font-bold text-sm block">Carrossel de doadores</span>
                   <span className="text-[10px] text-outline">Ordenar os 20 primeiros da home</span>
                 </div>
              </div>
              <span className="text-[10px] font-bold text-primary">Editar →</span>
           </div>

           <div className="admin-menu-item p-4 bg-surface-highest rounded-xl border border-outline/10 flex items-center justify-between cursor-pointer opacity-50">
              <div className="flex items-center gap-3">
                 <UserCheck size={20} className="text-success" />
                 <span className="font-bold text-sm">Validar Beneficiários (Em breve)</span>
              </div>
           </div>
        </section>

        <section className="admin-indications mb-8">
           <h3 className="section-title mb-4">Indicações pendentes</h3>
           {pendingIndications.length === 0 ? (
             <div className="bg-surface-highest p-4 rounded-xl border border-outline/10 text-center">
               <p className="text-sm text-outline">Nenhuma indicação pendente no momento.</p>
             </div>
           ) : (
             <div className="flex-col gap-4">
               {pendingIndications.map(ind => (
                 <div key={ind.id} className="bg-surface p-4 rounded-xl border border-outline/10 shadow-sm flex-col gap-2">
                    <div className="flex justify-between items-start">
                       <div>
                         <h4 className="font-bold text-primary">{ind.representativeName}</h4>
                         <p className="text-xs text-outline">{ind.region} • {ind.childrenCount} crianças</p>
                       </div>
                       <span className="text-[10px] font-bold px-2 py-1 bg-warning/20 text-warning uppercase rounded-full">Pendente</span>
                    </div>
                    <p className="text-xs text-text-main italic border-l-2 border-outline/20 pl-2 mt-1">"{ind.observation}"</p>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-outline/10">
                      <Button size="small" variant="outline" onClick={() => handleApproveIndication(ind.id)}>Aprovar (Lista)</Button>
                      <Button size="small" variant="outline" className="text-error border-error" onClick={() => handleRejectIndication(ind.id)}>Rejeitar</Button>
                      <Button size="small" variant="primary" onClick={handleForwardIndication}>Encaminhar</Button>
                      <Button size="small" variant="primary" className="bg-success text-inverted border-success" onClick={() => handleConvertIndication(ind.id)}>Converter</Button>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </section>

        <section className="system-tools">
           <h3 className="section-title mb-4">Ferramentas do Sistema</h3>
           <div className="flex-col gap-3">
             <Button 
               variant="outline" 
               fullWidth 
               icon={<RefreshCw size={18} />}
               onClick={() => {
                 showToast("Ciclo diário atualizado", "success");
                 refreshCounts();
               }}
             >
               Atualizar ciclo diário
             </Button>
             
             <Button 
               variant="outline" 
               fullWidth 
               className="mt-3 border-secondary text-secondary"
               onClick={async () => {
                 const pendingEntities = await adminService.getPendingEntities();
                 if (pendingEntities.length > 0) {
                   await adminService.approveEntity(pendingEntities[0].id);
                   showToast(`Entidade ${pendingEntities[0].name} aprovada com sucesso!`, "success");
                   refreshCounts();
                 } else {
                   showToast("Nenhuma entidade pendente encontrada para aprovar.", "info");
                 }
               }}
             >
               Aprovar Próxima Entidade
             </Button>

             <Button 
               variant="outline" 
               fullWidth 
               className="mt-3 border-success text-success"
               onClick={() => {
                 const FAMILIES_KEY = 'families_db';
                 const families = JSON.parse(localStorage.getItem(FAMILIES_KEY) || '[]');
                 const pendingFamilies = families.filter((f: any) => f.status === 'pending');
                 if (pendingFamilies.length > 0) {
                   pendingFamilies.forEach((f: any) => { f.status = 'approved'; f.supportStatus = 'needs_help'; });
                   localStorage.setItem(FAMILIES_KEY, JSON.stringify(families));
                   showToast(`${pendingFamilies.length} famílias aprovadas com sucesso!`, "success");
                   refreshCounts();
                 } else {
                   showToast("Nenhuma família pendente encontrada.", "info");
                 }
               }}
             >
               Aprovar Todas as Famílias Pendentes
             </Button>
           </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
