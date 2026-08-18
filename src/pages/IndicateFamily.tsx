import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { familyService } from '../backend/services/familyService';
import { Lock, ShieldAlert } from 'lucide-react';
import './RegisterFamily.css';

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

  // Lock condition: Calculate completed food supports based on totalDonated
  // R$ 30 is roughly 1 food support. Alexandre Doador has R$ 130 (4 supports) -> Locked.
  const completedSupportsCount = user ? Math.floor(user.totalDonated / 30) : 0;
  const isLocked = completedSupportsCount < 5;

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
      
      showToast("Indicação enviada com sucesso! Uma entidade parceira local irá analisar o caso.", "success");
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar indicação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-family-page">
      <AppHeader title="Indicar Família" showBack onBack={() => navigate(-1)} />

      <main className="content p-4">
        {/* ── Locked State View ── */}
        {isLocked ? (
          <div className="locked-indication-card p-6 bg-surface rounded-md border border-outline/10 text-center flex flex-col items-center my-6 shadow-sm">
            <div className="w-16 h-16 bg-error/5 text-error rounded-xl flex items-center justify-center mb-4 border border-error/10">
              <Lock size={32} />
            </div>
            
            <h2 className="text-xl font-extrabold text-primary mb-2">Indicação Bloqueada</h2>
            <p className="text-sm text-outline mb-6 leading-relaxed">
              Para evitar spam e indicações duplicadas, pedimos que doadores realizem no mínimo <strong>5 alimentações</strong> completas na plataforma antes de liberar a indicação de novas famílias.
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-surface-highest/60 rounded-sm h-3 mb-2 overflow-hidden border border-outline/5">
              <div 
                className="bg-secondary h-full transition-all"
                style={{ width: `${(completedSupportsCount / 5) * 100}%` }}
              ></div>
            </div>
            <span className="text-xs font-bold text-primary mb-6">{completedSupportsCount} de 5 alimentações realizadas</span>

            <Button 
              variant="primary" 
              fullWidth 
              onClick={() => navigate('/map')}
              className="bg-secondary text-primary"
            >
              Alimentar Crianças no Mapa
            </Button>
          </div>
        ) : (
          /* ── Unlocked Form View ── */
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-primary mb-2">
                Conhece alguma família precisando de alimento?
              </h2>
              <p className="text-outline text-xs leading-relaxed">
                Indique a família da sua comunidade. Uma entidade parceira local analisará o caso, fará a visita social e aprovará o cadastro oficial.
              </p>
            </div>

            {error && (
              <div className="bg-error/10 text-error p-3 rounded-md mb-4 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="register-form-container flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Nome da Família ou Representante *</label>
                <input
                  type="text"
                  name="representativeName"
                  value={formData.representativeName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ex: Família da Maria Conceição"
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
                  placeholder="Ex: Heliópolis - Setor A"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quantidade de Crianças</label>
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
                <label className="form-label">Contato do Responsável (opcional)</label>
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ex: Telefone (11) 98888-7777"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observações e Contexto Social</label>
                <textarea
                  name="observation"
                  value={formData.observation}
                  onChange={handleChange}
                  className="form-input"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Fale um pouco sobre a situação de moradia e alimentação da família..."
                />
              </div>

              <div className="p-4 bg-primary/5 rounded-md border border-primary/10 flex gap-3 my-2">
                <ShieldAlert size={20} className="text-secondary shrink-0" />
                <p className="text-xs text-outline leading-relaxed">
                  Sua indicação será encaminhada para as entidades validadoras ativas na região selecionada. Elas cuidarão da auditoria física antes do cadastro.
                </p>
              </div>

              <div className="submit-container mt-4">
                <Button
                  type="submit"
                  size="large"
                  fullWidth
                  loading={loading}
                  className="shadow-glow"
                >
                  Enviar Indicação de Família
                </Button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default IndicateFamily;
