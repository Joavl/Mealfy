import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { familyService } from '../backend/services/familyService';
import type { Family } from '../backend/types';
import MaskedInput from '../components/ui/MaskedInput';
import { applyMask } from '../utils/inputMasks';
import './RegisterFamily.css';

const RegisterFamily: React.FC = () => {
  const navigate = useNavigate();
  const { communities, user } = useAppContext();
  const { showToast } = useToast();

  const [isEntityMode, setIsEntityMode] = useState(true);
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
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let nextValue: string | number = value;
    if (name === 'childrenCount') {
      nextValue = parseInt(value) || 0;
    } else if (name === 'state') {
      nextValue = applyMask('uf', value);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  React.useEffect(() => {
    if (user?.role === 'donor') {
       navigate('/indicate-family', { replace: true });
    }
  }, [user, navigate]);

  React.useEffect(() => {
    if (communities.length > 0 && !formData.communityId) {
      setFormData((prev) => ({ ...prev, communityId: communities[0].id }));
    }
  }, [communities, formData.communityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!user?.entityId && user?.role === 'entity') {
        throw new Error('Sessão da entidade inválida. Faça login novamente.');
      }

      if (!formData.representativeName || !formData.communityId || !formData.shortAddress) {
        throw new Error('Por favor, preencha os campos obrigatórios.');
      }

      const childrenCount = Math.max(1, formData.childrenCount || 1);

      if (!formData.neighborhood?.trim()) {
        throw new Error('Informe o bairro da família.');
      }

      const newFamilyData: Omit<Family, 'id'> = {
        ...formData,
        childrenCount,
        description: formData.description?.trim() || 'Família cadastrada por entidade parceira Mealfy.',
        children: Array.from({ length: childrenCount }).map((_, i) => ({
          id: `c-${i}`,
          name: `Criança ${i+1}`,
          age: 5,
          school: 'Escola Local'
        })),
        authorizingEntityId: user?.entityId,
        createdByEntityId: user?.entityId,
        sourceType: 'entity',
        sourceLabel: `Cadastrado por ${user?.name || 'Entidade Parceira'}`,
        sourceEntityName: user?.name,
        supportStatus: (user?.status === 'approved') ? 'needs_help' : 'pending',
        status: (user?.status === 'approved') ? 'approved' : 'pending',
        distanceToUser: '2.5 km',
        priorityLevel: 3,
        latitude: -23.612 + (Math.random() * 0.05),
        longitude: -46.593 + (Math.random() * 0.05)
      };

      await familyService.addFamily(newFamilyData);
      const msg =
        user?.status === 'approved'
          ? 'Família cadastrada com sucesso!'
          : 'Família cadastrada e aguardando aprovação da entidade.';
      showToast(msg, 'success');
      
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

  return (
    <div className="register-family-page">
      <AppHeader title="Cadastrar Família" showBack />

      <main className="content p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-primary mb-2">
            Cadastro de Família Assistida
          </h2>
          <p className="text-outline text-sm leading-relaxed">
            Ao cadastrar esta família, sua entidade ("{user?.name}") passa a ser a fonte confiável e responsável pelas informações. 
            {user?.status === 'pending' && <span className="text-warning block mt-2 font-bold">Sua entidade está em análise. O cadastro da família também ficará pendente.</span>}
          </p>
        </div>

        {error && (
          <div className="bg-error/10 text-error p-3 rounded-lg mb-4 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form-container">

          <div className="form-group">
            <label className="form-label">Nome do Representante *</label>
            <input
              type="text"
              name="representativeName"
              value={formData.representativeName}
              onChange={handleChange}
              className="form-input"
              placeholder="Ex: Maria da Silva"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Comunidade *</label>
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
              placeholder="Rua das Acácias, 120"
              required
            />
          </div>

          <div className="flex gap-3">
            <div className="form-group w-1/2">
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
            <div className="flex gap-3 w-1/2">
              <div className="form-group w-2/3">
                <label className="form-label">Cidade</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-group w-1/3">
                <label className="form-label">UF</label>
                <MaskedInput
                  mask="uf"
                  name="state"
                  value={formData.state}
                  onValueChange={(state) => setFormData((prev) => ({ ...prev, state }))}
                  className="form-input"
                  placeholder="SP"
                  maxLength={2}
                  inputMode="text"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="form-group w-1/2">
              <label className="form-label">Quantidade de Filhos</label>
              <input
                type="number"
                name="childrenCount"
                value={formData.childrenCount}
                onChange={handleChange}
                className="form-input"
                min="0"
                max="15"
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
                <option value="Alimentação Básica">Alimentação</option>
                <option value="Higiene Pessoal">Higiene</option>
                <option value="Material Escolar">Material Escolar</option>
                <option value="Medicamentos">Medicamentos</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Breve Descrição da Situação</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-textarea"
              placeholder="Descreva a situação atual da família para que os doadores possam conhecer a história..."
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