import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { familyService } from '../backend/services/familyService';
import MaskedInput from '../components/ui/MaskedInput';
import './RegisterFamily.css'; // Reusing some styles

const IndicateFamily: React.FC = () => {
  const navigate = useNavigate();
  const { communities, user } = useAppContext();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    representativeName: '',
    communityId: communities.length > 0 ? communities[0].id : '',
    region: '',
    childrenCount: 0,
    observation: '',
    contact: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect entities gracefully
  React.useEffect(() => {
    if (user?.role === 'entity') {
       navigate('/register-family', { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'childrenCount' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.representativeName || !formData.region) {
        throw new Error('Por favor, preencha os campos obrigatórios.');
      }

      await familyService.addIndication({
        representativeName: formData.representativeName,
        region: formData.region,
        childrenCount: formData.childrenCount,
        observation: formData.observation,
        contact: formData.contact,
        indicatedByUserId: user?.id || 'mock-donor'
      });
      
      showToast("Indicação enviada com sucesso! Uma entidade irá analisar o caso.", "success");
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar indicação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-family-page">
      <AppHeader title="Indicar Família" showBack />

      <main className="content p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-primary mb-2">
            Conhece alguém precisando de ajuda?
          </h2>
          <p className="text-outline text-sm leading-relaxed">
            Indique uma família da sua comunidade. Uma entidade parceira na região fará a validação e o cadastro oficial da família na plataforma.
          </p>
        </div>

        {error && (
          <div className="bg-error/10 text-error p-3 rounded-lg mb-4 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form-container">
          <div className="form-group">
            <label className="form-label">Nome da Família ou Representante *</label>
            <input
              type="text"
              name="representativeName"
              value={formData.representativeName}
              onChange={handleChange}
              className="form-input"
              placeholder="Ex: Família da Dona Maria"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Região / Bairro *</label>
            <input
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
              className="form-input"
              placeholder="Ex: Heliópolis - Perto da quadra"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Quantidade de Crianças (aprox.)</label>
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

          <div className="form-group">
            <label className="form-label">Contato (opcional)</label>
            <MaskedInput
              mask="contact"
              name="contact"
              value={formData.contact}
              onValueChange={(contact) => setFormData((prev) => ({ ...prev, contact }))}
              className="form-input"
              placeholder="(00) 00000-0000 ou referência"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Observações sobre a situação</label>
            <textarea
              name="observation"
              value={formData.observation}
              onChange={handleChange}
              className="form-textarea"
              placeholder="Descreva por que essa família precisa de ajuda..."
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
              Enviar Indicação
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default IndicateFamily;
