import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { familyService } from '../backend/services/familyService';
import type { Family } from '../backend/types';
import { Heart, MapPin, AlertCircle, Building2 } from 'lucide-react';
import './FamilyDetails.css';

const FamilyDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      familyService.getFamilies().then(fams => {
        const found = fams.find(f => f.id === id);
        if (found) {
          setFamily(found);
        }
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <div className="p-4 text-center mt-10">Carregando família...</div>;
  if (!family) return <div className="p-4 text-center mt-10 text-error">Família não encontrada.</div>;

  const handleDonateToFamily = () => {
    // Navigate to normal DonationChoice but carry exact family
    navigate('/donate', { state: { targetFamily: family } });
  };

  return (
    <div className="family-details-page">
      <AppHeader title="Ficha de Apoio" showBack onBack={() => navigate(-1)} />
      
      <main className="content p-4">
        <div className="family-header-card mb-4">
          <div className="fh-avatar">{family.representativeName.charAt(0)}</div>
          <h2 className="fh-title text-primary">{family.representativeName}</h2>
          <div className="fh-location flex items-center justify-center gap-1 text-sm text-outline mt-1">
            <MapPin size={14} /> {family.shortAddress}, {family.city}
          </div>
        </div>

        <div className="bg-surface-highest p-4 rounded-xl border border-outline/10 mb-6 flex-col gap-2">
           <h3 className="text-xs font-bold text-outline uppercase tracking-wide">Fonte das informações</h3>
           
           {family.originalIndicationId && (
             <div className="mb-2 pb-2 border-b border-outline/10">
               <p className="text-xs text-secondary font-bold flex items-center gap-1">
                 <Heart size={14} /> Origem inicial: indicação de doador
               </p>
             </div>
           )}

           <p className="text-sm font-semibold text-text-main flex items-center gap-2">
             <Building2 size={16} className="text-secondary" />
             {family.sourceLabel || (family.sourceType === 'entity' ? `Cadastrado por ${family.sourceEntityName || 'Entidade Parceira'}` : 'Cadastrado por Parceiro Oficial')}
           </p>
           {family.sourceType === 'entity' && (
             <div className="text-xs text-outline flex-col gap-1 mt-1">
               <p>Tipo: Entidade Autorizada</p>
               <p>Status da entidade: Aprovada e Auditada</p>
             </div>
           )}
        </div>

        <section className="family-description mb-6">
          <h3 className="text-sm font-semibold mb-2 text-outline uppercase tracking-wide">Contexto</h3>
          <p className="text-sm leading-relaxed">{family.description}</p>
        </section>

        <section className="family-children mb-6">
          <h3 className="text-sm font-semibold mb-2 text-outline uppercase tracking-wide flex justify-between">
            <span>Crianças ({family.childrenCount})</span>
            <span className="text-primary">Prioridade Nível {family.priorityLevel}</span>
          </h3>
          <div className="children-list flex-col gap-2">
            {family.children.map(child => (
              <div key={child.id} className="child-card flex justify-between items-center">
                <div>
                  <span className="font-semibold text-sm">{child.name}</span>
                  <span className="text-xs text-outline ml-2">{child.age} anos</span>
                </div>
                <span className="text-xs text-outline tag-school">{child.school}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="family-urgency mb-8">
          <div className="urgency-box flex items-start gap-3">
            <AlertCircle size={20} className="text-warning mt-1" />
            <div>
              <h4 className="font-semibold mb-1">Necessidade Principal</h4>
              <p className="text-sm">{family.mainNeed}</p>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed-bottom-action blur-bg">
        <Button 
          size="large" fullWidth className="shadow-glow"
          onClick={handleDonateToFamily}
          icon={<Heart size={20} />}
        >
          Enviar crédito iFood
        </Button>
      </div>
    </div>
  );
};

export default FamilyDetails;
