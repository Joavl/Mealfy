import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import type { Family } from '../backend/types';
import { Heart, MapPin, AlertCircle, CheckCircle2, Loader as Loader2, Wallet } from 'lucide-react';
import { isBeneficiaryEligible } from '../backend/utils/timeUtils';
import { familyService } from '../backend/services/familyService';
import { PROVIDER_LABELS } from '../backend/mockData/giftCardInventory';
import './FamilyDetails.css';

const FamilyDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fonte de verdade única: backend (GET /families/:id via familyService).
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setLoadError(null);
      try {
        const found = await familyService.getFamilyById(id);
        if (active) setFamily(found);
      } catch (err: any) {
        if (active) setLoadError(err?.message || 'Não foi possível carregar esta família.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center" style={{ height: '70vh' }}>
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="family-details-page">
        <AppHeader title="Ficha de Apoio" showBack onBack={() => navigate('/map')} />
        <main className="content p-4 flex flex-col items-center justify-center text-center gap-4" style={{ minHeight: '60vh' }}>
          <AlertCircle size={40} className="text-outline" />
          <p className="text-sm text-text-main font-semibold">{loadError}</p>
          <Button variant="primary" onClick={() => navigate('/map')}>Voltar para o mapa</Button>
        </main>
      </div>
    );
  }
  if (!family) {
    return (
      <div className="family-details-page">
        <AppHeader title="Ficha de Apoio" showBack onBack={() => navigate('/map')} />
        <main className="content p-4 flex flex-col items-center justify-center text-center gap-4" style={{ minHeight: '60vh' }}>
          <AlertCircle size={40} className="text-outline" />
          <p className="text-sm text-text-main font-semibold">Família não encontrada.</p>
          <Button variant="primary" onClick={() => navigate('/map')}>Voltar para o mapa</Button>
        </main>
      </div>
    );
  }

  const canDonate = isBeneficiaryEligible(family);
  const isUrgent = family.priorityLevel >= 4 && canDonate;

  const handleDonateToFamily = () => {
    // Leva a família exata para o fluxo de doação
    navigate('/donate', { state: { targetFamily: family } });
  };

  return (
    <div className="family-details-page">
      <AppHeader title="Ficha de Apoio" showBack onBack={() => navigate(-1)} />

      <main className="content p-4">
        {/* ── Family Card with optional Urgency Glow ── */}
        <div className={`family-header-card mb-4 ${isUrgent ? 'urgent-header-glow' : ''}`}>
          <div className="fh-avatar">{family.representativeName.charAt(0)}</div>
          <h2 className="fh-title text-primary">{family.representativeName}</h2>
          <div className="fh-location flex items-center justify-center gap-1 text-sm text-outline mt-1">
            <MapPin size={14} /> {(family.community || family.neighborhood)}, {family.neighborhood} — {family.city}/{family.state}
          </div>
        </div>

        {/* ── Localização aproximada (segura: sem endereço residencial completo) ── */}
        <section className="bg-surface p-4 rounded-md border border-outline/10 mb-6 flex flex-col gap-1.5">
          <h3 className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Localização aproximada</h3>
          <p className="text-sm text-text-main"><strong>Comunidade:</strong> {family.community || family.neighborhood}</p>
          <p className="text-sm text-text-main"><strong>Bairro:</strong> {family.neighborhood} · <strong>Cidade:</strong> {family.city}/{family.state}</p>
          {family.zone && <p className="text-sm text-text-main"><strong>Zona:</strong> {family.zone}</p>}
          <p className="text-sm text-text-main"><strong>Endereço aproximado:</strong> {family.approximateAddress || family.shortAddress}</p>
          {family.referencePoint && <p className="text-sm text-text-main"><strong>Referência:</strong> {family.referencePoint}</p>}
          <p className="text-[10px] text-outline mt-1 italic">Por segurança, o endereço residencial completo não é exibido publicamente.</p>
        </section>

        {/* ── Context ── */}
        <section className="family-description mb-6">
          <h3 className="text-[10px] font-bold mb-2 text-outline uppercase tracking-wider">Contexto</h3>
          <p className="text-sm leading-relaxed text-text-main">"{family.description}"</p>
        </section>

        {/* ── Dependentes (parentesco + elegibilidade 0-17) ── */}
        <section className="family-children mb-6">
          <h3 className="text-[10px] font-bold mb-2 text-outline uppercase tracking-wider flex justify-between">
            <span>Dependentes ({family.childrenCount})</span>
            <span className={isUrgent ? 'text-error font-extrabold' : 'text-primary'}>
              Prioridade Nível {family.priorityLevel}/5
            </span>
          </h3>
          <div className="children-list flex flex-col gap-2">
            {family.children.length === 0 ? (
              <div className="text-xs text-outline italic p-2 bg-surface rounded-sm border border-outline/5">
                Não há detalhes individuais dos dependentes cadastrados.
              </div>
            ) : (
              family.children.map(child => {
                const eligible = child.age >= 0 && child.age <= 17;
                return (
                  <div key={child.id} className="child-card flex justify-between items-center p-3 bg-surface rounded-sm border border-outline/5">
                    <div>
                      <span className="font-semibold text-sm">{child.name}</span>
                      <span className="text-xs text-outline ml-2">{child.age} anos · {child.relationship || 'filho(a)'}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${eligible ? 'bg-success/15 text-success' : 'bg-surface-highest text-outline'}`}>
                      {eligible ? 'Elegível 0–17' : 'Fora da faixa'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── Doação / Vale ── */}
        <section className="mb-6 bg-surface p-4 rounded-md border border-outline/10 flex flex-col gap-1.5">
          <h3 className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Doação</h3>
          <p className="text-sm text-text-main flex items-center gap-2">
            <Wallet size={15} className="text-secondary" />
            Vale escolhido: <strong>{PROVIDER_LABELS[family.preferredGiftCardProvider || 'ifood']}</strong>
          </p>
          {family.incomeApprox && <p className="text-sm text-text-main"><strong>Renda aproximada:</strong> {family.incomeApprox}</p>}
          {family.vulnerabilities && family.vulnerabilities.length > 0 && (
            <p className="text-sm text-text-main"><strong>Vulnerabilidades:</strong> {family.vulnerabilities.join(', ')}</p>
          )}
          <p className="text-sm text-text-main">
            <strong>Status:</strong>{' '}
            {canDonate ? 'Disponível para receber hoje' : 'Já alimentada hoje — próxima liberação às 08h'}
          </p>
        </section>

        {/* ── Alimentada por ── */}
        <section className="mb-6">
          <h3 className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">Alimentada por</h3>
          {!canDonate && family.lastFedByName ? (
            <div className="flex items-center gap-3 p-3 bg-surface rounded-md border border-outline/10">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                {family.lastFedByAvatar?.startsWith('http')
                  ? <img src={family.lastFedByAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                  : (family.lastFedByName.charAt(0).toUpperCase())}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary truncate">{family.lastFedByName}</p>
                {family.lastFedByInstagram && (
                  <a href={`https://instagram.com/${family.lastFedByInstagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="text-xs text-secondary">
                    {family.lastFedByInstagram}
                  </a>
                )}
                <p className="text-[11px] text-outline">
                  {family.lastFedAt ? new Date(family.lastFedAt).toLocaleDateString('pt-BR') + ' às ' + new Date(family.lastFedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Hoje'}
                  {family.lastGiftCardProvider ? ` · Vale ${PROVIDER_LABELS[family.lastGiftCardProvider]}` : ''}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-outline italic p-3 bg-surface rounded-md border border-outline/5">
              Ainda aguardando o primeiro apoio de hoje.
            </p>
          )}
        </section>

        {/* ── Urgency Box ── */}
        <section className="family-urgency mb-8">
          <div className={`urgency-box flex items-start gap-3 p-4 rounded-md border ${
            isUrgent ? 'border-error/20 bg-error/5' : 'border-outline/10 bg-surface'
          }`}>
            <AlertCircle size={20} className={isUrgent ? 'text-error mt-0.5' : 'text-secondary mt-0.5'} />
            <div>
              <h4 className="font-semibold mb-1 text-sm text-primary">O que essa família precisa hoje</h4>
              <p className="text-sm text-text-main">{family.mainNeed}</p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Bottom floating action: doar (elegível) ou aviso de "já alimentada hoje" ── */}
      <div className="fixed-bottom-action blur-bg">
        {canDonate ? (
          <Button
            size="large"
            fullWidth
            className="shadow-glow"
            onClick={handleDonateToFamily}
            icon={<Heart size={20} />}
          >
            Alimentar essa família
          </Button>
        ) : (
          <div className="family-fed-state flex items-center gap-3 p-4 rounded-md bg-success/10 border border-success/20">
            <CheckCircle2 size={22} className="text-success flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-success">Esta família já foi alimentada hoje.</p>
              <p className="text-xs text-outline">Próxima liberação às 08h. Que tal apoiar outra família por perto?</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyDetails;
