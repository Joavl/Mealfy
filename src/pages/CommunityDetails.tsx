import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { communityService } from '../backend/services/communityService';
import { familyService } from '../backend/services/familyService';
import { isPubliclyVisibleFamily } from '../backend/utils/familyUtils';
import type { Community, Family } from '../backend/types';
import { MapPin, Heart, ShieldAlert } from 'lucide-react';
import './CommunityDetails.css';

const CommunityDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [community, setCommunity] = useState<Community | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      Promise.all([
        communityService.getCommunityById(id),
        familyService.getFamiliesByCommunity(id)
      ]).then(([commRes, famRes]) => {
        setCommunity(commRes || null);
        // Only list families that need help for individual picking and are publicly visible
        setFamilies(famRes.filter(f => isPubliclyVisibleFamily(f) && f.supportStatus === 'needs_help'));
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <div className="p-4 text-center mt-10">Carregando região...</div>;
  if (!community) return <div className="p-4 text-center mt-10 text-error">Comunidade não encontrada.</div>;

  return (
    <div className="community-details-page">
      <AppHeader title="Região" showBack onBack={() => navigate(-1)} />
      
      <main className="content">
        <section className="community-hero p-4">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-primary font-bold" style={{ fontSize: '1.8rem' }}>{community.name}</h1>
            <div className={`status-badge status-${community.urgencyColor}`}>
              {community.priority}
            </div>
          </div>
          <div className="flex items-center gap-2 text-outline mb-4 text-sm">
            <MapPin size={16} /> {community.region} • {community.distance}
          </div>
          <p className="text-sm mb-6">{community.description}</p>
          
          <div className="big-donation-card">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <ShieldAlert size={18} className="text-primary" />
              Modo Ampliado
            </h3>
            <p className="text-sm text-outline mb-4">
              Abrace a causa de forma coletiva. Faça uma contribuição única que será distribuída para diversas famílias desta comunidade simultaneamente.
            </p>
            <Button 
              size="large" 
              fullWidth 
              className="shadow-glow"
              disabled={families.length === 0}
              onClick={() => navigate(`/big-donation`, { state: { community } })}
            >
              Apoio regional via iFood
            </Button>
            {families.length === 0 && (
              <p className="text-center text-xs text-error mt-2">
                Nenhuma família precisando de apoio no momento nesta comunidade.
              </p>
            )}
          </div>
        </section>

        <section className="families-section p-4">
          <h2 className="section-title mb-4">Ou apoie uma família específica</h2>
          
          {families.length === 0 ? (
            <div className="text-center p-4 border rounded text-outline text-sm">
              Graças a doadores como você, não há filas de espera críticas nesta comunidade agora.
            </div>
          ) : (
            <div className="families-grid flex-col gap-4">
              {families.map(fam => (
                <div key={fam.id} className="family-card" onClick={() => navigate(`/family/${fam.id}`)}>
                  <div className="family-card-content flex gap-3">
                    <div className="family-avatar">
                      {fam.representativeName.charAt(0)}
                    </div>
                    <div className="family-info flex-1">
                      <h4 className="font-bold text-primary">{fam.representativeName}</h4>
                      <p className="text-xs text-outline mb-2">{fam.childrenCount} filhos • {fam.shortAddress}</p>
                      <div className="flex justify-between items-center">
                         <span className="text-xs font-semibold px-2 py-1 bg-surface-highest rounded">
                           Prioridade {fam.priorityLevel}/5
                         </span>
                         <Heart size={18} className="text-error" />
                      </div>
                      <div className="mt-2 pt-2 border-t border-outline/10 text-[10px] text-outline/80 flex items-center gap-1">
                        Fonte: {fam.sourceEntityName || 'Parceiro Oficial'}
                      </div>
                    </div>
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

export default CommunityDetails;
