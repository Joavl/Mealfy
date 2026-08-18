import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { authService } from '../backend/services/authService';
import { useToast } from '../context/ToastContext';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Soup, Building2, ArrowRight, ArrowLeft, X,
  CircleUser as UserCircle, Eye, EyeOff,
} from 'lucide-react';
import './Auth.css';
import './Register.css';

type RoleStep = 'donor' | 'entity' | 'beneficiary';

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// ── Máscaras de documento ─────────────────────────────────────────────────
const onlyDigits = (v: string) => v.replace(/\D/g, '');
const maskCPF = (v: string) => onlyDigits(v).slice(0, 11)
  .replace(/(\d{3})(\d)/, '$1.$2')
  .replace(/(\d{3})(\d)/, '$1.$2')
  .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const maskCNPJ = (v: string) => onlyDigits(v).slice(0, 14)
  .replace(/(\d{2})(\d)/, '$1.$2')
  .replace(/(\d{3})(\d)/, '$1.$2')
  .replace(/(\d{3})(\d)/, '$1/$2')
  .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
const maskDocument = (v: string, type: 'cpf' | 'cnpj') => (type === 'cnpj' ? maskCNPJ(v) : maskCPF(v));

const validatePasswords = (pwd: string, confirm: string): string | null => {
  if (pwd.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
  if (pwd !== confirm) return 'As senhas não coincidem.';
  return null;
};

// ── Step definitions per role ─────────────────────────────────────────────
interface StepDef {
  id: string;
}

const DONOR_STEPS: StepDef[] = [
  { id: 'name' },
  { id: 'email' },
  { id: 'document' },
  { id: 'password' },
  { id: 'confirmPassword' },
  { id: 'phone' },
  { id: 'instagram' },
  { id: 'preferences' },
  { id: 'summary' },
];

const ENTITY_STEPS: StepDef[] = [
  { id: 'name' },
  { id: 'cnpjType' },
  { id: 'responsibleName' },
  { id: 'email' },
  { id: 'password' },
  { id: 'confirmPassword' },
  { id: 'phoneRegion' },
  { id: 'summary' },
];

const BENEFICIARY_STEPS: StepDef[] = [
  { id: 'name' },
  { id: 'email' },
  { id: 'password' },
  { id: 'confirmPassword' },
  { id: 'phone' },
  { id: 'summary' },
];

const ROLE_STEPS: Record<RoleStep, StepDef[]> = {
  donor: DONOR_STEPS,
  entity: ENTITY_STEPS,
  beneficiary: BENEFICIARY_STEPS,
};

// ── Animation variants (vertical slide + fade) ──────────────────────────────
const variants = {
  enter: (dir: number) => ({ y: dir >= 0 ? 48 : -48, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (dir: number) => ({ y: dir >= 0 ? -48 : 48, opacity: 0 }),
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { fetchSession, signIn } = useAppContext();

  const [role, setRole] = useState<RoleStep | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // ── Donor form ───────────────────────────────────────────────────────────
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
    anonymousMode: false,
  });

  // ── Entity form ──────────────────────────────────────────────────────────
  const [entityData, setEntityData] = useState({
    name: '',
    cnpj: '',
    type: 'ONG' as 'ONG' | 'igreja' | 'escola' | 'instituto',
    responsibleName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    region: '',
  });

  // ── Beneficiary form ─────────────────────────────────────────────────────
  const [beneficiaryData, setBeneficiaryData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  const steps = role ? ROLE_STEPS[role] : [];
  const currentStep = steps[stepIndex];
  const totalSteps = steps.length;
  const progress = role ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  // ── Generic data helpers ────────────────────────────────────────────────
  const getData = (): any => {
    if (role === 'donor') return donorData;
    if (role === 'entity') return entityData;
    return beneficiaryData;
  };

  const setField = (field: string, value: any) => {
    if (role === 'donor') setDonorData(prev => ({ ...prev, [field]: value }));
    else if (role === 'entity') setEntityData(prev => ({ ...prev, [field]: value }));
    else if (role === 'beneficiary') setBeneficiaryData(prev => ({ ...prev, [field]: value }));
  };

  // ── Navigation ───────────────────────────────────────────────────────────
  const selectRole = (newRole: RoleStep) => {
    setDirection(1);
    setRole(newRole);
    setStepIndex(0);
  };

  const goNext = () => {
    if (!role) return;
    if (stepIndex < steps.length - 1) {
      setDirection(1);
      setStepIndex(i => i + 1);
    }
  };

  const goBack = () => {
    if (!role) return;
    if (stepIndex > 0) {
      setDirection(-1);
      setStepIndex(i => i - 1);
    } else {
      setDirection(-1);
      setRole(null);
    }
  };

  const isCurrentStepValid = (): boolean => {
    if (!role || !currentStep) return false;
    const data = getData();
    switch (currentStep.id) {
      case 'name': return data.name.trim().length > 0;
      case 'email': return isValidEmail(data.email);
      case 'document': return onlyDigits(data.documentNumber).length === (data.documentType === 'cnpj' ? 14 : 11);
      case 'cnpjType': return onlyDigits(data.cnpj).length === 14;
      case 'responsibleName': return data.responsibleName.trim().length > 0;
      case 'password': return data.password.length >= 6;
      case 'confirmPassword': return validatePasswords(data.password, data.confirmPassword) === null;
      case 'phone': return true;
      case 'instagram': return true;
      case 'preferences': return true;
      case 'phoneRegion': return data.phone.trim().length > 0 && data.region.trim().length > 0;
      case 'summary': return true;
      default: return true;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isCurrentStepValid()) goNext();
    } else if (e.key === 'Backspace' && e.currentTarget.value === '') {
      goBack();
    }
  };

  // ── Submit handlers ──────────────────────────────────────────────────────
  const handleRegisterDonor = async () => {
    setIsLoading(true);
    try {
      await authService.registerUser({
        name: donorData.name,
        email: donorData.email,
        password: donorData.password,
        role: 'donor',
        phone: donorData.phone,
      });
      // Auto-login após cadastro de doador (status active)
      await signIn(donorData.email, donorData.password);
      showToast('Conta criada com sucesso!', 'success');
      navigate('/dashboard-redirect', { replace: true });
    } catch (err: any) {
      showToast(err?.message || 'Erro ao criar conta.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterEntity = async () => {
    setIsLoading(true);
    try {
      await authService.registerEntity({
        name: entityData.name,
        cnpj: entityData.cnpj,
        type: entityData.type,
        responsibleName: entityData.responsibleName,
        email: entityData.email,
        phone: entityData.phone,
        region: entityData.region,
      });
      await fetchSession();
      showToast('Cadastro enviado para análise. Você pode entrar quando aprovado.', 'success');
      navigate('/auth', { replace: true });
    } catch (err: any) {
      showToast(err?.message || 'Erro ao cadastrar entidade.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterBeneficiary = async () => {
    setIsLoading(true);
    try {
      await authService.registerUser({
        name: beneficiaryData.name,
        email: beneficiaryData.email,
        password: beneficiaryData.password,
        role: 'beneficiary',
        phone: beneficiaryData.phone,
      });
      showToast('Conta criada! Aguarde vinculação com uma entidade para ter acesso completo.', 'success');
      navigate('/auth', { replace: true });
    } catch (err: any) {
      showToast(err?.message || 'Erro ao criar conta.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (role === 'donor') handleRegisterDonor();
    else if (role === 'entity') handleRegisterEntity();
    else if (role === 'beneficiary') handleRegisterBeneficiary();
  };

  // ── Password field helper ────────────────────────────────────────────────
  const PwdToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button type="button" className="auth-pwd-toggle" onClick={onToggle} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  // ── Step content renderer ───────────────────────────────────────────────
  const renderStepBody = () => {
    if (!role || !currentStep) return null;
    const data = getData();

    switch (currentStep.id) {
      case 'name':
        return (
          <>
            <h1 className="typeform-question">
              {role === 'entity' ? 'Qual é o nome da sua entidade?' : 'Qual é o seu nome completo?'}
            </h1>
            <div className="typeform-field">
              <input
                autoFocus
                type="text"
                className="typeform-input"
                placeholder="Digite aqui..."
                value={data.name}
                onChange={e => setField('name', e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </>
        );

      case 'email':
        return (
          <>
            <h1 className="typeform-question">
              {role === 'entity' ? 'Qual o e-mail comercial da entidade?' : 'Qual é o seu e-mail?'}
            </h1>
            <div className="typeform-field">
              <input
                autoFocus
                type="email"
                className="typeform-input"
                placeholder="seuemail@exemplo.com"
                value={data.email}
                onChange={e => setField('email', e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="email"
              />
            </div>
            {data.email.length > 0 && !isValidEmail(data.email) && (
              <span className="typeform-error">Informe um e-mail válido.</span>
            )}
          </>
        );

      case 'document':
        return (
          <>
            <h1 className="typeform-question">Qual o seu documento?</h1>
            <p className="typeform-hint">Usado para validar sua identidade como apoiador.</p>
            <div className="typeform-chip-row">
              <button
                className={`typeform-chip ${data.documentType === 'cpf' ? 'active' : ''}`}
                onClick={() => setField('documentType', 'cpf')}
              >
                CPF
              </button>
              <button
                className={`typeform-chip ${data.documentType === 'cnpj' ? 'active' : ''}`}
                onClick={() => setField('documentType', 'cnpj')}
              >
                CNPJ
              </button>
            </div>
            <div className="typeform-field">
              <input
                autoFocus
                type="text"
                className="typeform-input"
                placeholder={data.documentType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                inputMode="numeric"
                value={data.documentNumber}
                onChange={e => setField('documentNumber', maskDocument(e.target.value, data.documentType))}
                onKeyDown={handleKeyDown}
              />
            </div>
          </>
        );

      case 'cnpjType':
        return (
          <>
            <h1 className="typeform-question">Qual o CNPJ e o tipo da entidade?</h1>
            <div className="typeform-field">
              <input
                autoFocus
                type="text"
                className="typeform-input"
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                value={data.cnpj}
                onChange={e => setField('cnpj', maskCNPJ(e.target.value))}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="typeform-chip-row" style={{ marginTop: 'var(--spacing-4)', flexWrap: 'wrap' }}>
              {(['ONG', 'igreja', 'escola', 'instituto'] as const).map(type => (
                <button
                  key={type}
                  className={`typeform-chip ${data.type === type ? 'active' : ''}`}
                  onClick={() => setField('type', type)}
                >
                  {type === 'ONG' ? 'ONG' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </>
        );

      case 'responsibleName':
        return (
          <>
            <h1 className="typeform-question">Quem é o responsável pela entidade?</h1>
            <div className="typeform-field">
              <input
                autoFocus
                type="text"
                className="typeform-input"
                placeholder="Nome completo"
                value={data.responsibleName}
                onChange={e => setField('responsibleName', e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </>
        );

      case 'password':
        return (
          <>
            <h1 className="typeform-question">Crie uma senha de acesso</h1>
            <p className="typeform-hint">Mínimo de 6 caracteres.</p>
            <div className="typeform-field typeform-input-wrapper">
              <input
                autoFocus
                type={showPwd ? 'text' : 'password'}
                className="typeform-input"
                placeholder="••••••"
                value={data.password}
                onChange={e => setField('password', e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="new-password"
              />
              <PwdToggle show={showPwd} onToggle={() => setShowPwd(v => !v)} />
            </div>
          </>
        );

      case 'confirmPassword': {
        const pwdError = data.confirmPassword.length > 0 ? validatePasswords(data.password, data.confirmPassword) : null;
        return (
          <>
            <h1 className="typeform-question">Confirme sua senha</h1>
            <div className="typeform-field typeform-input-wrapper">
              <input
                autoFocus
                type={showConfirmPwd ? 'text' : 'password'}
                className="typeform-input"
                placeholder="••••••"
                value={data.confirmPassword}
                onChange={e => setField('confirmPassword', e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="new-password"
              />
              <PwdToggle show={showConfirmPwd} onToggle={() => setShowConfirmPwd(v => !v)} />
            </div>
            {pwdError && <span className="typeform-error">{pwdError}</span>}
          </>
        );
      }

      case 'phone':
        return (
          <>
            <h1 className="typeform-question">Qual o seu telefone?</h1>
            <p className="typeform-hint">Opcional — pressione Enter para pular.</p>
            <div className="typeform-field">
              <input
                autoFocus
                type="tel"
                className="typeform-input"
                placeholder="(11) 99999-9999"
                value={data.phone}
                onChange={e => setField('phone', e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </>
        );

      case 'instagram':
        return (
          <>
            <h1 className="typeform-question">Tem Instagram?</h1>
            <p className="typeform-hint">Opcional — pressione Enter para pular.</p>
            <div className="typeform-field">
              <input
                autoFocus
                type="text"
                className="typeform-input"
                placeholder="@seu_usuario"
                value={data.instagram}
                onChange={e => setField('instagram', e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </>
        );

      case 'preferences':
        return (
          <>
            <h1 className="typeform-question">Suas preferências de privacidade</h1>
            <div className="typeform-checkbox-list">
              <label className="typeform-checkbox-row">
                <input
                  type="checkbox"
                  checked={donorData.showInstagram}
                  onChange={e => setField('showInstagram', e.target.checked)}
                />
                <span>Exibir Instagram no perfil</span>
              </label>
              <label className="typeform-checkbox-row">
                <input
                  type="checkbox"
                  checked={donorData.showOnRanking}
                  onChange={e => setField('showOnRanking', e.target.checked)}
                />
                <span>Aparecer no Ranking</span>
              </label>
              <label className="typeform-checkbox-row">
                <input
                  type="checkbox"
                  checked={donorData.anonymousMode}
                  onChange={e => setField('anonymousMode', e.target.checked)}
                />
                <span>Apoiar anonimamente</span>
              </label>
            </div>
          </>
        );

      case 'phoneRegion':
        return (
          <>
            <h1 className="typeform-question">Telefone e região de atuação</h1>
            <div className="typeform-field">
              <input
                autoFocus
                type="tel"
                className="typeform-input"
                placeholder="Telefone"
                value={data.phone}
                onChange={e => setField('phone', e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="typeform-field" style={{ marginTop: 'var(--spacing-4)' }}>
              <input
                type="text"
                className="typeform-input"
                placeholder="Região (ex: Heliópolis - SP)"
                value={data.region}
                onChange={e => setField('region', e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </>
        );

      case 'summary': {
        if (role === 'donor') {
          return (
            <>
              <h1 className="typeform-question">Tudo certo!</h1>
              <p className="typeform-hint">Confira seus dados antes de criar sua conta.</p>
              <div className="typeform-summary-list">
                <div className="typeform-summary-row"><span>Nome</span><span>{donorData.name}</span></div>
                <div className="typeform-summary-row"><span>E-mail</span><span>{donorData.email}</span></div>
                <div className="typeform-summary-row"><span>Telefone</span><span>{donorData.phone || '—'}</span></div>
                <div className="typeform-summary-row"><span>Tipo de conta</span><span>Apoiador</span></div>
              </div>
            </>
          );
        }
        if (role === 'entity') {
          return (
            <>
              <h1 className="typeform-question">Quase lá!</h1>
              <p className="typeform-hint">Confira os dados da sua entidade — seu cadastro entrará em análise.</p>
              <div className="typeform-summary-list">
                <div className="typeform-summary-row"><span>Entidade</span><span>{entityData.name}</span></div>
                <div className="typeform-summary-row"><span>Responsável</span><span>{entityData.responsibleName}</span></div>
                <div className="typeform-summary-row"><span>E-mail</span><span>{entityData.email}</span></div>
                <div className="typeform-summary-row"><span>Região</span><span>{entityData.region}</span></div>
              </div>
            </>
          );
        }
        return (
          <>
            <h1 className="typeform-question">Quase lá!</h1>
            <p className="typeform-hint">Confira seus dados antes de criar sua conta.</p>
            <div className="typeform-summary-list">
              <div className="typeform-summary-row"><span>Nome</span><span>{beneficiaryData.name}</span></div>
              <div className="typeform-summary-row"><span>E-mail</span><span>{beneficiaryData.email}</span></div>
              <div className="typeform-summary-row"><span>Telefone</span><span>{beneficiaryData.phone || '—'}</span></div>
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  // ── Role picker (step 0) ────────────────────────────────────────────────
  const renderRolePicker = () => (
    <>
      <div className="typeform-brand">Mealfy</div>
      <h1 className="typeform-question text-center">Como você quer participar?</h1>
      <div className="typeform-choice-list">
        <button className="typeform-choice-card" onClick={() => selectRole('donor')}>
          <div className="typeform-choice-icon bg-primary/10 text-primary">
            <Soup size={22} />
          </div>
          <div className="typeform-choice-text">
            <h3>Quero apoiar</h3>
            <p>Apoie em poucos segundos e acompanhe seu impacto.</p>
          </div>
          <ArrowRight size={18} className="text-outline/40" />
        </button>

        <button className="typeform-choice-card" onClick={() => selectRole('entity')}>
          <div className="typeform-choice-icon bg-secondary/10 text-secondary">
            <Building2 size={22} />
          </div>
          <div className="typeform-choice-text">
            <h3>Sou uma entidade</h3>
            <p>Cadastre famílias e gerencie apoios para sua comunidade.</p>
          </div>
          <ArrowRight size={18} className="text-outline/40" />
        </button>

        <button className="typeform-choice-card" onClick={() => selectRole('beneficiary')}>
          <div className="typeform-choice-icon bg-success/10 text-success">
            <UserCircle size={22} />
          </div>
          <div className="typeform-choice-text">
            <h3>Sou Beneficiário</h3>
            <p>Crie sua conta para acessar seu painel de recebimentos.</p>
          </div>
          <ArrowRight size={18} className="text-outline/40" />
        </button>
      </div>

      <div className="text-center mt-6">
        <button className="text-primary font-bold text-sm" onClick={() => navigate('/auth')}>
          Já tenho uma conta
        </button>
      </div>
    </>
  );

  const stepKey = role ? `${role}-${currentStep?.id}` : 'role-picker';
  const isLastStep = role ? stepIndex === steps.length - 1 : false;

  return (
    <div className="typeform-page">
      <div className="typeform-progress-track">
        <div className="typeform-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="typeform-header">
        <button
          className="typeform-back-btn"
          onClick={goBack}
          disabled={!role}
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>

        {role ? (
          <span className="typeform-step-counter">Pergunta {stepIndex + 1} de {totalSteps}</span>
        ) : (
          <span />
        )}

        <button className="typeform-exit-btn" onClick={() => navigate('/auth')} aria-label="Fechar">
          <X size={18} />
        </button>
      </div>

      <div className="typeform-body">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={stepKey}
            className="typeform-step"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {role ? renderStepBody() : renderRolePicker()}

            {role && (
              isLastStep ? (
                <Button
                  size="large"
                  fullWidth
                  loading={isLoading}
                  className="typeform-continue-btn"
                  onClick={handleSubmit}
                >
                  {role === 'entity' ? 'Cadastrar Organização' : 'Criar Conta'}
                </Button>
              ) : (
                <button
                  className="typeform-continue-btn"
                  disabled={!isCurrentStepValid()}
                  onClick={goNext}
                >
                  Continuar <ArrowRight size={18} />
                </button>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Register;
