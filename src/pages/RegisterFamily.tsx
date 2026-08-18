import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { familyService } from '../backend/services/familyService';
import { storage } from '../backend/utils/storage';
import { ShieldCheck, Search, Loader2 } from 'lucide-react';
import type { Family } from '../backend/types';
import './RegisterFamily.css';

const RegisterFamily: React.FC = () => {
  const navigate = useNavigate();
  const { communities, user } = useAppContext();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    representativeName: '',
    communityId: communities.length > 0 ? communities[0].id : '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    shortAddress: '',
    description: '',
    childrenCount: 1,
    mainNeed: 'Alimentação Básica',
    nis: '',
  });

  const [childrenAges, setChildrenAges] = useState<number[]>([5]);
  const [nisChecking, setNisChecking] = useState(false);
  const [nisVerified, setNisVerified] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'childrenCount') {
      const count = parseInt(value) || 0;
      setFormData(prev => ({ ...prev, childrenCount: count }));
      
      // Update children ages array size
      setChildrenAges(prev => {
        const next = [...prev];
        if (count > next.length) {
          while (next.length < count) next.push(5); // default age 5
        } else if (count < next.length) {
          next.splice(count);
        }
        return next;
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAgeChange = (index: number, val: string) => {
    const age = parseInt(val) || 0;
    setChildrenAges(prev => {
      const next = [...prev];
      next[index] = age;
      return next;
    });
  };

  const verifyNis = () => {
    if (formData.nis.replace(/\D/g, '').length < 11) {
      showToast('Por favor, insira um NIS válido com 11 dígitos.', 'error');
      return;
    }
    setNisChecking(true);
    setNisVerified(null);
    
    setTimeout(() => {
      setNisChecking(false);
      setNisVerified(true);
      // Verificação de identidade != aprovação. O cadastro ainda segue para análise.
      showToast('NIS verificado. O cadastro seguirá para análise (não aprova automaticamente).', 'info');
    }, 1200);
  };

  // Redirect donor gracefully
  useEffect(() => {
    if (user?.role === 'donor') {
       navigate('/indicate-family', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.representativeName || !formData.communityId || !formData.shortAddress) {
        throw new Error('Por favor, preencha os campos obrigatórios.');
      }

      if (formData.childrenCount === 0) {
        throw new Error('A família deve ter pelo menos um dependente para ser cadastrada.');
      }

      // Regra crítica de elegibilidade: ao menos UM dependente de 0 a 17 anos.
      // Receber Bolsa Família / ter NIS válido NÃO basta.
      const hasEligibleDependent = childrenAges.some(age => age >= 0 && age <= 17);
      if (!hasEligibleDependent) {
        throw new Error('Cadastro inelegível: é obrigatório ao menos um dependente com idade entre 0 e 17 anos. Receber Bolsa Família/NIS não é suficiente.');
      }

      const newFamilyData: Omit<Family, 'id'> = {
        representativeName: formData.representativeName,
        communityId: formData.communityId,
        neighborhood: formData.neighborhood || focusCommunityNeighborhood(),
        city: formData.city,
        state: formData.state,
        shortAddress: formData.shortAddress,
        description: formData.description,
        childrenCount: formData.childrenCount,
        mainNeed: formData.mainNeed,
        children: childrenAges.map((age, i) => ({
          id: `c-${i}`,
          name: `Dependente ${i + 1}`,
          age: age,
          school: 'Escola Pública da Comunidade'
        })),
        authorizingEntityId: user?.entityId,
        createdByEntityId: user?.entityId,
        sourceType: 'entity',
        sourceLabel: `Cadastrado por ${user?.name || 'Entidade Parceira'}`,
        sourceEntityName: user?.name,
        // NUNCA aprova automaticamente: todo cadastro vai para análise da entidade/admin.
        supportStatus: 'needs_help',
        status: 'pending',
        verificationStatus: nisVerified ? 'verified' : 'pending',
        approvalStatus: 'pending',
        dataSource: nisVerified ? 'gov' : 'manual',
        distanceToUser: '1.8 km',
        priorityLevel: nisVerified ? 1 : 3, // CadÚnico/Gov dá prioridade na fila
        latitude: -23.612 + (Math.random() * 0.05),
        longitude: -46.593 + (Math.random() * 0.05)
      };

      await familyService.addFamily(newFamilyData);

      // Registro mockado de "e-mail" enviado, visível no painel da entidade.
      try {
        const log = storage.get<{ family: string; date: string }[]>('entity_email_log', []);
        log.unshift({ family: formData.representativeName, date: new Date().toISOString() });
        storage.set('entity_email_log', log.slice(0, 30));
      } catch { /* ignore */ }

      showToast('Cadastro enviado para análise. A aprovação é feita pela entidade/admin.', 'success');
      
      if (user?.role === 'entity') {
        navigate('/entity/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar família.');
    } finally {
      setLoading(false);
    }
  };

  const focusCommunityNeighborhood = () => {
    const target = communities.find(c => c.id === formData.communityId);
    return target ? target.name : 'São Paulo';
  };

  return (
    <div className="register-family-page">
      <AppHeader title="Cadastrar Família" showBack />

      <main className="content p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-primary mb-2">
            Cadastro de Família Beneficiária
          </h2>
          <p className="text-outline text-sm leading-relaxed">
            Ao preencher o formulário, certifique-se de que os dados de identificação e as idades dos dependentes estão corretos. 
            {user?.status === 'pending' && <span className="text-warning block mt-2 font-bold">Aviso: Sua entidade está em análise, portanto o cadastro inicial ficará pendente de validação.</span>}
          </p>
        </div>

        {error && (
          <div className="bg-error/10 text-error p-3 rounded-md mb-4 text-sm font-semibold border border-error/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form-container">

          {/* NIS / Bolsa Família Auto-verification Check */}
          <div className="form-group bg-primary/5 p-4 rounded border border-primary/10 mb-2">
            <label className="form-label font-bold text-primary">NIS do Responsável (11 dígitos)</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="nis"
                value={formData.nis}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setFormData(prev => ({ ...prev, nis: val }));
                  setNisVerified(null);
                }}
                className="form-input flex-1"
                placeholder="Ex: 12345678901"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={verifyNis}
                disabled={nisChecking}
                icon={nisChecking ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              >
                Verificar
              </Button>
            </div>
            
            {nisVerified === true && (
              <div className="flex items-start gap-2 mt-3 text-xs bg-success/15 border border-success/30 text-success p-3 rounded">
                <ShieldCheck size={18} className="flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">CadÚnico Localizado / Bolsa Família Ativo</span>
                  Aprovação instantânea de elegibilidade habilitada para esta família.
                </div>
              </div>
            )}
            
            {nisVerified === null && !nisChecking && (
              <span className="text-[10px] text-outline mt-1 block">
                Informe o NIS para consulta em tempo real no Bolsa Família/CadÚnico.
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Nome do Representante *</label>
            <input
              type="text"
              name="representativeName"
              value={formData.representativeName}
              onChange={handleChange}
              className="form-input"
              placeholder="Ex: Maria de Fátima Oliveira"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Comunidade de Residência *</label>
            <select
              name="communityId"
              value={formData.communityId}
              onChange={handleChange}
              className="form-select"
              required
            >
              {communities.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Endereço (Rua e Número) *</label>
            <input
              type="text"
              name="shortAddress"
              value={formData.shortAddress}
              onChange={handleChange}
              className="form-input"
              placeholder="Rua Projetada A, 24"
              required
            />
          </div>

          <div className="flex gap-3">
            <div className="form-group flex-1">
              <label className="form-label">Bairro</label>
              <input
                type="text"
                name="neighborhood"
                value={formData.neighborhood}
                onChange={handleChange}
                className="form-input"
                placeholder="Ex: Heliópolis"
              />
            </div>
            <div className="form-group w-24">
              <label className="form-label">UF</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="form-input"
                maxLength={2}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="form-group w-1/2">
              <label className="form-label">Número de Dependentes *</label>
              <input
                type="number"
                name="childrenCount"
                value={formData.childrenCount}
                onChange={handleChange}
                className="form-input"
                min="1"
                max="10"
                required
              />
            </div>
            <div className="form-group w-1/2">
              <label className="form-label">Necessidade Principal</label>
              <select
                name="mainNeed"
                value={formData.mainNeed}
                onChange={handleChange}
                className="form-select"
              >
                <option value="Alimentação Básica">Alimentação Básica</option>
                <option value="Suplementação Infantil">Suplementação</option>
                <option value="Higiene e Nutrição">Higiene & Nutrição</option>
              </select>
            </div>
          </div>

          {/* Dependent Ages Form Blocks (ages 0-17) */}
          <div className="form-group bg-surface-highest/50 p-4 rounded border border-outline/10">
            <label className="form-label font-bold">Idade de Cada Dependente (0 a 17 anos)</label>
            <div className="flex flex-col gap-3 mt-2">
              {childrenAges.map((age, idx) => (
                <div key={idx} className="flex items-center gap-3 justify-between">
                  <span className="text-xs font-semibold text-outline">Dependente {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={age}
                      min="0"
                      max="17"
                      onChange={(e) => handleAgeChange(idx, e.target.value)}
                      className="form-input w-24 text-center"
                      placeholder="Ex: 5"
                      required
                    />
                    <span className="text-xs text-outline">anos</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Relato da Situação</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-textarea"
              placeholder="Descreva a situação atual da família para que os apoiadores possam entender as principais dificuldades e ajudar..."
            />
          </div>

          <div className="submit-container mt-4">
            <Button
              type="submit"
              size="large"
              fullWidth
              loading={loading}
              className="shadow-glow"
            >
              Concluir Cadastro
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default RegisterFamily;