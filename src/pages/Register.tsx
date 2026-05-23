import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { authService } from '../backend/services/authService';
import { useToast } from '../context/ToastContext';
import { useAppContext } from '../context/AppContext';
import { Heart, Building2, ArrowRight } from 'lucide-react';
import { MealfyLogo } from '../components/ui/MealfyLogo';
import MaskedInput from '../components/ui/MaskedInput';
import { applyMask } from '../utils/inputMasks';
import './Auth.css'; // Reusing some auth styles for consistency

type RegisterStep = 'picker' | 'donor' | 'entity';

function resolveInitialStep(pathname: string): RegisterStep {
  if (pathname.endsWith('/register-donor')) return 'donor';
  if (pathname.endsWith('/register-entity')) return 'entity';
  return 'picker';
}

type RegisterProps = {
  initialStep?: RegisterStep;
};

const Register: React.FC<RegisterProps> = ({ initialStep: initialStepProp }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { fetchSession } = useAppContext();

  const routeStep = resolveInitialStep(location.pathname);
  const [step, setStep] = useState<RegisterStep>(initialStepProp ?? routeStep);

  useEffect(() => {
    const next = initialStepProp ?? routeStep;
    if (next !== 'picker') setStep(next);
  }, [initialStepProp, routeStep]);
  const [isLoading, setIsLoading] = useState(false);

  // Formulário Doador
  const [donorData, setDonorData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    documentType: 'cpf' as 'cpf' | 'cnpj',
    documentNumber: '',
    phone: '',
    instagram: '',
    showInstagram: true,
    showOnRanking: true,
    anonymousMode: false
  });

  // Formulário Entidade
  const [entityData, setEntityData] = useState({
    name: '',
    cnpj: '',
    type: 'ONG' as any,
    responsibleName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    region: ''
  });

  const handleRegisterDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (donorData.password.length < 6) {
      showToast('A senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }
    if (donorData.password !== donorData.confirmPassword) {
      showToast('As senhas não coincidem.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await authService.registerDonor({
        name: donorData.name,
        email: donorData.email,
        password: donorData.password,
        phone: donorData.phone,
        documentType: donorData.documentType,
        documentNumber: donorData.documentNumber,
        instagram: donorData.instagram,
        privacySettings: {
          showInstagram: donorData.showInstagram,
          showOnRanking: donorData.showOnRanking,
          anonymousMode: donorData.anonymousMode
        }
      });
      await fetchSession();
      showToast('Conta criada com sucesso!', 'success');
      navigate('/dashboard-redirect', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar conta.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entityData.password.length < 6) {
      showToast('A senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }
    if (entityData.password !== entityData.confirmPassword) {
      showToast('As senhas não coincidem.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      await authService.registerEntity({
        name: entityData.name,
        cnpj: entityData.cnpj,
        type: entityData.type,
        responsibleName: entityData.responsibleName,
        email: entityData.email,
        password: entityData.password,
        phone: entityData.phone,
        region: entityData.region
      });
      await fetchSession();
      showToast('Cadastro de entidade enviado para análise.', 'success');
      navigate('/entity/dashboard', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar entidade.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'donor') {
    return (
      <div className="auth-page login-view">
        <div className="login-hero">
          <button
            className="back-btn active:scale-95 transition-transform"
            onClick={() => (routeStep === 'donor' ? navigate('/auth') : setStep('picker'))}
          >
            <ArrowRight size={24} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <h1 className="login-hero-title">Criar conta como Doador</h1>
          <p className="login-hero-subtitle">Crie sua conta para doar com rapidez e acompanhar seu impacto.</p>
        </div>
        <main className="login-content p-6 flex-col">
          <form onSubmit={handleRegisterDonor} className="flex-col gap-4 mt-2">
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <input type="text" className="form-input" required value={donorData.name} onChange={e => setDonorData({...donorData, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input type="email" className="form-input" required value={donorData.email} onChange={e => setDonorData({...donorData, email: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <input type="password" className="form-input" required minLength={6} autoComplete="new-password" value={donorData.password} onChange={e => setDonorData({...donorData, password: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar senha</label>
              <input type="password" className="form-input" required minLength={6} autoComplete="new-password" value={donorData.confirmPassword} onChange={e => setDonorData({...donorData, confirmPassword: e.target.value})} />
            </div>
            
            <div className="flex gap-3">
              <div className="form-group w-1/3">
                <label className="form-label">Tipo</label>
                <select
                  className="form-select"
                  value={donorData.documentType}
                  onChange={(e) => {
                    const documentType = e.target.value as 'cpf' | 'cnpj';
                    setDonorData({
                      ...donorData,
                      documentType,
                      documentNumber: applyMask(documentType, donorData.documentNumber),
                    });
                  }}
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                </select>
              </div>
              <div className="form-group flex-1">
                <label className="form-label">{donorData.documentType === 'cpf' ? 'CPF' : 'CNPJ'}</label>
                <MaskedInput
                  mask={donorData.documentType}
                  className="form-input"
                  required
                  placeholder={donorData.documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0001-00'}
                  value={donorData.documentNumber}
                  onValueChange={(documentNumber) => setDonorData({ ...donorData, documentNumber })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Telefone (opcional)</label>
              <MaskedInput
                mask="phone"
                className="form-input"
                placeholder="(00) 00000-0000"
                value={donorData.phone}
                onValueChange={(phone) => setDonorData({ ...donorData, phone })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Instagram (opcional)</label>
              <MaskedInput
                mask="instagram"
                className="form-input"
                placeholder="@seu_usuario"
                inputMode="text"
                value={donorData.instagram}
                onValueChange={(instagram) => setDonorData({ ...donorData, instagram })}
              />
            </div>

            <div className="bg-surface-highest p-4 rounded-xl flex-col gap-3 my-2">
              <label className="flex items-center gap-2 text-sm text-text-main">
                <input type="checkbox" checked={donorData.showInstagram} onChange={e => setDonorData({...donorData, showInstagram: e.target.checked})} />
                Exibir Instagram no perfil
              </label>
              <label className="flex items-center gap-2 text-sm text-text-main">
                <input type="checkbox" checked={donorData.showOnRanking} onChange={e => setDonorData({...donorData, showOnRanking: e.target.checked})} />
                Aparecer no Ranking
              </label>
              <label className="flex items-center gap-2 text-sm text-text-main">
                <input type="checkbox" checked={donorData.anonymousMode} onChange={e => setDonorData({...donorData, anonymousMode: e.target.checked})} />
                Doar anonimamente
              </label>
            </div>

            <Button type="submit" size="large" fullWidth loading={isLoading} className="mt-2">Criar Conta</Button>
            <button
              type="button"
              className="text-primary font-bold text-sm text-center mt-4 mx-auto block"
              onClick={() => navigate('/auth')}
            >
              Já tenho conta — entrar
            </button>
          </form>
        </main>
      </div>
    );
  }

  if (step === 'entity') {
    return (
      <div className="auth-page login-view">
        <div className="login-hero">
          <button
            className="back-btn active:scale-95 transition-transform"
            onClick={() => (routeStep === 'entity' ? navigate('/auth') : setStep('picker'))}
          >
            <ArrowRight size={24} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <h1 className="login-hero-title" style={{fontSize: '1.75rem'}}>Seja uma entidade autorizada</h1>
          <p className="login-hero-subtitle">Após aprovação, sua organização poderá cadastrar famílias e crianças assistidas pela rede Mealfy.</p>
        </div>
        <main className="login-content p-6 flex-col">
          <form onSubmit={handleRegisterEntity} className="flex-col gap-4 mt-2">
            <div className="form-group">
              <label className="form-label">Nome da Entidade</label>
              <input type="text" className="form-input" required value={entityData.name} onChange={e => setEntityData({...entityData, name: e.target.value})} />
            </div>
            
            <div className="flex gap-3">
              <div className="form-group w-1/2">
                <label className="form-label">CNPJ</label>
                <MaskedInput
                  mask="cnpj"
                  className="form-input"
                  required
                  placeholder="00.000.000/0001-00"
                  value={entityData.cnpj}
                  onValueChange={(cnpj) => setEntityData({ ...entityData, cnpj })}
                />
              </div>
              <div className="form-group w-1/2">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={entityData.type} onChange={e => setEntityData({...entityData, type: e.target.value as any})}>
                  <option value="ONG">ONG</option>
                  <option value="igreja">Igreja</option>
                  <option value="escola">Escola</option>
                  <option value="instituto">Instituto</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nome do Responsável</label>
              <input type="text" className="form-input" required value={entityData.responsibleName} onChange={e => setEntityData({...entityData, responsibleName: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">E-mail Comercial</label>
              <input type="email" className="form-input" required value={entityData.email} onChange={e => setEntityData({...entityData, email: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <input type="password" className="form-input" required minLength={6} autoComplete="new-password" value={entityData.password} onChange={e => setEntityData({...entityData, password: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar senha</label>
              <input type="password" className="form-input" required minLength={6} autoComplete="new-password" value={entityData.confirmPassword} onChange={e => setEntityData({...entityData, confirmPassword: e.target.value})} />
            </div>

            <div className="flex gap-3">
               <div className="form-group w-1/2">
                 <label className="form-label">Telefone</label>
                 <MaskedInput
                   mask="phone"
                   className="form-input"
                   required
                   placeholder="(00) 00000-0000"
                   value={entityData.phone}
                   onValueChange={(phone) => setEntityData({ ...entityData, phone })}
                 />
               </div>
               <div className="form-group w-1/2">
                 <label className="form-label">Região/Comunidade</label>
                 <input type="text" className="form-input" required value={entityData.region} onChange={e => setEntityData({...entityData, region: e.target.value})} />
               </div>
            </div>

            <Button type="submit" size="large" fullWidth loading={isLoading} className="mt-4">Cadastrar Organização</Button>
            <p className="text-xs text-center text-outline mt-2">Sua solicitação entrará em análise pela nossa equipe.</p>
            <button
              type="button"
              className="text-primary font-bold text-sm text-center mt-4 mx-auto block"
              onClick={() => navigate('/auth')}
            >
              Já tenho conta — entrar
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-page role-picker-view">
      <AppHeader transparent showBack onBack={() => navigate('/auth')} />
      <div className="auth-hero pt-16">
        <div className="auth-hero-overlay"></div>
        <img 
          src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
          alt="Criança sorrindo" 
          className="auth-hero-image"
        />
        <div className="auth-hero-content">
          <MealfyLogo size="lg" className="auth-hero-logo" />
          <h1 className="text-3xl font-bold text-white leading-tight mb-2">Como você quer participar?</h1>
        </div>
      </div>

      <main className="auth-content p-6 flex-col">
        <div className="roles-list flex-col gap-4 mb-6 mt-4">
          <button className="role-card-btn active:scale-95 transition-transform" onClick={() => setStep('donor')}>
            <div className="role-icon-wrapper bg-primary/10 text-primary">
              <Heart size={24} />
            </div>
            <div className="role-card-text">
               <h3>Quero doar</h3>
               <p>Doe em poucos segundos e acompanhe seu impacto.</p>
            </div>
            <ArrowRight size={20} className="text-outline/40" />
          </button>
          
          <button className="role-card-btn active:scale-95 transition-transform" onClick={() => setStep('entity')}>
            <div className="role-icon-wrapper bg-secondary/10 text-secondary">
              <Building2 size={24} />
            </div>
            <div className="role-card-text">
               <h3>Sou uma entidade</h3>
               <p>Cadastre famílias da sua comunidade e ajude a conectar doações.</p>
            </div>
            <ArrowRight size={20} className="text-outline/40" />
          </button>
        </div>

        <div className="auth-footer mt-auto text-center flex-col gap-4">
          <button
            type="button"
            className="text-success font-bold text-sm active:scale-95 transition-transform"
            onClick={() => navigate('/register-beneficiary')}
          >
            Sou beneficiário — cadastrar minha família
          </button>
          <button
            className="text-primary font-bold flex items-center justify-center gap-2 mx-auto active:scale-95 transition-transform text-sm"
            onClick={() => navigate('/auth')}
          >
            Já tenho uma conta
          </button>
        </div>
      </main>
    </div>
  );
};

export default Register;
