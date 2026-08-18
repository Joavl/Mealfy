import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import type { Community, Family } from '../backend/types';
import { MapPin, Heart, ShieldAlert, Users, CheckSquare, Square } from 'lucide-react';
import './CommunityDetails.css';

// Consistent communities mock data
const MOCK_COMMUNITIES_MAP: Record<string, Community> = {
  'c1': { id: 'c1', name: 'Heliópolis', region: 'Zona Sul, SP', description: 'A maior comunidade de SP, com redes ativas de apoio mas grandes focos de vulnerabilidade alimentar.', distance: '1.2 km', familiesTotal: 340, familiesInNeed: 120, priority: 'Alta urgência', urgencyColor: 'error' },
  'c2': { id: 'c2', name: 'Paraisópolis', region: 'Zona Sul, SP', description: 'Região com forte engajamento cultural, possuindo bolsões críticos onde o alimento é escasso.', distance: '3.5 km', familiesTotal: 210, familiesInNeed: 85, priority: 'Alta urgência', urgencyColor: 'error' },
  'c3': { id: 'c3', name: 'Cidade Tiradentes', region: 'Zona Leste, SP', description: 'Grande concentração de famílias de baixa renda e crianças em idade escolar necessitando de nutrição.', distance: '8.0 km', familiesTotal: 156, familiesInNeed: 40, priority: 'Atenção', urgencyColor: 'warning' },
  'c4': { id: 'c4', name: 'Brasilândia', region: 'Zona Norte, SP', description: 'Bairro periférico montanhoso com alta densidade demográfica e famílias em situação de vulnerabilidade.', distance: '12.4 km', familiesTotal: 250, familiesInNeed: 95, priority: 'Alta urgência', urgencyColor: 'error' },
};

// Consistent families mock data by communityId
const MOCK_FAMILIES_BY_COMM: Record<string, Family[]> = {
  'c1': [
    { id: 'f1', communityId: 'c1', representativeName: 'Maria Silva', neighborhood: 'Heliópolis', city: 'São Paulo', state: 'SP', shortAddress: 'Viela 3, Setor B', description: 'Mãe solo, desempregada temporariamente com 2 filhos em idade de creche.', childrenCount: 2, children: [], mainNeed: 'Alimentação infantil e fraldas', supportStatus: 'needs_help', distanceToUser: '1.2 km', priorityLevel: 5, latitude: -23.6151, longitude: -46.5912, sourceEntityName: 'Coletivo Heliópolis Solidário' },
    { id: 'f2', communityId: 'c1', representativeName: 'Dona Cida', neighborhood: 'Heliópolis', city: 'São Paulo', state: 'SP', shortAddress: 'Rua do Sol, 45', description: 'Aposentada que cuida sozinha de 3 netos após o falecimento da filha.', childrenCount: 3, children: [], mainNeed: 'Cesta de alimentos frescos', supportStatus: 'needs_help', distanceToUser: '1.4 km', priorityLevel: 4, latitude: -23.6180, longitude: -46.5940, sourceEntityName: 'Coletivo Heliópolis Solidário' }
  ],
  'c2': [
    { id: 'f5', communityId: 'c2', representativeName: 'Alice Rocha', neighborhood: 'Paraisópolis', city: 'São Paulo', state: 'SP', shortAddress: 'Rua Central, 88', description: 'Família em extrema vulnerabilidade com 4 filhos pequenos.', childrenCount: 4, children: [], mainNeed: 'Alimentação infantil diária', supportStatus: 'needs_help', distanceToUser: '3.3 km', priorityLevel: 5, latitude: -23.6110, longitude: -46.7260, sourceEntityName: 'União Paraisópolis' }
  ],
  'c3': [
    { id: 'f3', communityId: 'c3', representativeName: 'Roberto e Sônia', neighborhood: 'Cidade Tiradentes', city: 'São Paulo', state: 'SP', shortAddress: 'Setor G, Prédio 3', description: 'Casal com 3 filhos. Ambos faziam bicos mas perderam renda nas últimas semanas.', childrenCount: 3, children: [], mainNeed: 'Suplementação alimentar para crianças', supportStatus: 'needs_help', distanceToUser: '8.1 km', priorityLevel: 4, latitude: -23.5855, longitude: -46.4011, sourceEntityName: 'Associação Tiradentes Viva' }
  ],
  'c4': [
    { id: 'f6', communityId: 'c4', representativeName: 'Regina Santos', neighborhood: 'Brasilândia', city: 'São Paulo', state: 'SP', shortAddress: 'Rua do Morro, 102', description: 'Mãe solo, diarista desempregada cuidando de 3 crianças.', childrenCount: 3, children: [], mainNeed: 'Alimento básico e leite', supportStatus: 'needs_help', distanceToUser: '12.4 km', priorityLevel: 5, latitude: -23.4688, longitude: -46.6997, sourceEntityName: 'Brasilândia Unida' }
  ]
};

const CommunityDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [community, setCommunity] = useState<Community | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modo Ampliado Toggle
  const [isModoAmpliado, setIsModoAmpliado] = useState(false);
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      // Load mock community
      const comm = MOCK_COMMUNITIES_MAP[id] || MOCK_COMMUNITIES_MAP['c1'];
      setCommunity(comm);
      
      // Load mock families
      const fams = MOCK_FAMILIES_BY_COMM[id] || [];
      setFamilies(fams);
      setLoading(false);
    }
  }, [id]);

  const toggleFamilySelection = (famId: string) => {
    setSelectedFamilyIds(prev => 
      prev.includes(famId) ? prev.filter(item => item !== famId) : [...prev, famId]
    );
  };

  const handleBatchSupport = () => {
    if (selectedFamilyIds.length === 0) return;
    navigate('/donate', { state: { selectedFamilyIds, targetCommunity: community } });
  };

  if (loading) return <div className="p-4 text-center mt-10">Carregando região...</div>;
  if (!community) return <div className="p-4 text-center mt-10 text-error">Comunidade não encontrada.</div>;

  return (
    <div className="community-details-page">
      <AppHeader title="Região de Impacto" showBack onBack={() => navigate(-1)} />
      
      <main className="content">
        {/* ── Community Card ── */}
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
          <p className="text-sm mb-6 text-text-main leading-relaxed">{community.description}</p>
          
          {/* ── Mode Toggle Bar ── */}
          <div className="mode-toggle-card p-3 bg-surface rounded-md border border-outline/10 mb-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-primary" />
              <span className="text-xs font-bold text-outline uppercase tracking-wider">Modo Coletivo / Ampliado</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isModoAmpliado}
                onChange={(e) => setIsModoAmpliado(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>
          
          {/* ── Modo Ampliado Card (Active State) ── */}
          {isModoAmpliado && (
            <div className="big-donation-card glassmorphism p-4 my-2 border border-secondary/20">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-primary">
                <ShieldAlert size={18} className="text-secondary" />
                Apoio Regional Coletivo
              </h3>
              <p className="text-xs text-outline mb-4 leading-relaxed">
                Abrace a causa de forma unificada. Faça uma contribuição única que será distribuída de forma inteligente entre as famílias desta comunidade.
              </p>
              <Button 
                size="large" 
                fullWidth 
                className="shadow-glow"
                onClick={() => navigate(`/big-donation`, { state: { community } })}
              >
                Alimentar Região de Forma Ampliada
              </Button>
            </div>
          )}
        </section>

        {/* ── Families List ── */}
        {!isModoAmpliado && (
          <section className="families-section p-4">
            <h2 className="section-title mb-4 font-bold text-primary">Selecione as famílias para apoiar</h2>
            
            {families.length === 0 ? (
              <div className="text-center p-6 border rounded-md text-outline text-sm italic">
                Graças ao apoio constante de nossa rede, não há famílias aguardando refeições nesta comunidade no momento.
              </div>
            ) : (
              <div className="families-grid flex flex-col gap-4">
                {families.map(fam => {
                  const isChecked = selectedFamilyIds.includes(fam.id);
                  return (
                    <div 
                      key={fam.id} 
                      className={`family-card p-4 rounded-md border transition-all flex gap-3 items-center cursor-pointer ${
                        isChecked ? 'border-primary bg-primary/5' : 'border-outline/10 bg-white'
                      }`}
                      onClick={() => toggleFamilySelection(fam.id)}
                    >
                      {/* Checkbox Icon */}
                      <div className="selection-checkbox text-primary shrink-0">
                        {isChecked ? <CheckSquare size={20} /> : <Square size={20} className="text-outline/40" />}
                      </div>

                      <div className="family-avatar shrink-0">
                        {fam.representativeName.charAt(0)}
                      </div>
                      
                      <div className="family-info flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-primary">{fam.representativeName}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-surface-highest rounded-sm">
                            Prioridade {fam.priorityLevel}/5
                          </span>
                        </div>
                        <p className="text-xs text-outline mb-1">{fam.childrenCount} filhos • {fam.shortAddress}</p>
                        <p className="text-xs text-text-main line-clamp-1 italic">"{fam.description}"</p>
                        <div className="mt-2 text-[10px] text-outline/80">
                          ONG: {fam.sourceEntityName || 'Parceiro Oficial'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── Bottom floating action button for batch support ── */}
      {!isModoAmpliado && selectedFamilyIds.length > 0 && (
        <div className="fixed-bottom-action blur-bg">
          <Button 
            size="large" 
            fullWidth 
            className="shadow-glow bg-secondary border-secondary text-primary"
            onClick={handleBatchSupport}
            icon={<Heart size={20} />}
          >
            Alimentar {selectedFamilyIds.length} {selectedFamilyIds.length === 1 ? 'família' : 'famílias'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CommunityDetails;
