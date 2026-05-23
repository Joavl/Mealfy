import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Heart, Building2, UserCircle, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { UserRole } from '../backend/types';
import { MealfyLogo } from '../components/ui/MealfyLogo';
import MaskedInput from '../components/ui/MaskedInput';
import { socialService } from '../backend/services/socialService';
import { maskCpf } from '../utils/inputMasks';
import './Auth.css';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAsRole, login, isAuthenticated, user } = useAppContext();
  const { showToast } = useToast();

  const [view, setView] = useState<'picker' | 'login'>('picker');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname || '/dashboard-redirect';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setView('login');
    // Pre-fill for easier testing
    if (role === 'donor') setIdentifier('doador@mealfy.com');
    if (role === 'admin') setIdentifier('admin@mealfy.com');
    if (role === 'entity') setIdentifier('entidade@mealfy.com');
    if (role === 'beneficiary') setIdentifier(maskCpf('12345678900'));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !identifier) return;

    if (selectedRole !== 'beneficiary' && password.length < 6) {
      showToast('Informe sua senha (mínimo 6 caracteres).', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await loginAsRole(selectedRole, identifier, password || undefined);
      showToast('Login realizado com sucesso', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar. Verifique seus dados e tente novamente.';
      showToast(msg, 'error');
      setIsLoading(false);
    }
  };

  if (view === 'login') {
    return (
      <div className="auth-page login-view">
        <div className="login-hero">
          <button className="back-btn active:scale-95 transition-transform" onClick={() => setView('picker')}>
            <ArrowRight size={24} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <h1 className="login-hero-title">
            {selectedRole === 'donor' && 'Entrar como Doador'}
            {selectedRole === 'entity' && 'Acesso Entidade'}
            {selectedRole === 'beneficiary' && 'Acessar Benefício'}
            {selectedRole === 'admin' && 'Acesso Administrativo'}
          </h1>
          <p className="login-hero-subtitle">
            {selectedRole === 'donor' && 'Acompanhe seu impacto e doe rapidamente.'}
            {selectedRole === 'entity' && 'Gerencie famílias e doações da sua comunidade.'}
            {selectedRole === 'beneficiary' && 'Consulte seus gift cards e status.'}
            {selectedRole === 'admin' && 'Área de gestão da plataforma.'}
          </p>
        </div>

        <main className="login-content p-6 flex-col">
          <form onSubmit={handleLogin} className="flex-col gap-5 mt-4">
            <div className="form-group">
              <label className="form-label">
                {selectedRole === 'beneficiary' ? 'CPF ou Telefone' : 'E-mail'}
              </label>
              {selectedRole === 'beneficiary' ? (
                <MaskedInput
                  mask="cpfOrPhone"
                  className="form-input"
                  placeholder="000.000.000-00 ou (00) 00000-0000"
                  value={identifier}
                  onValueChange={setIdentifier}
                  required
                />
              ) : (
                <input
                  type="email"
                  className="form-input"
                  placeholder="nome@exemplo.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              )}
            </div>

            {selectedRole !== 'beneficiary' && (
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  minLength={6}
                />
                <p className="text-[10px] text-outline mt-1">
                  Contas demo: e-mail do sistema (ex: doador@mealfy.com) e senha <strong>mealfy123</strong>.
                  Contas criadas por você usam a senha definida no cadastro.
                </p>
              </div>
            )}

            <Button
              type="submit"
              size="large"
              fullWidth
              loading={isLoading}
              className="mt-2"
            >
              Continuar
            </Button>

            {selectedRole === 'donor' && (
              <Button
                type="button"
                variant="outline"
                size="large"
                fullWidth
                className="mt-2"
                onClick={() => navigate('/register-donor')}
              >
                Primeira vez? Criar conta de doador
              </Button>
            )}

            {selectedRole === 'entity' && (
              <Button
                type="button"
                variant="outline"
                size="large"
                fullWidth
                className="mt-2"
                onClick={() => navigate('/register-entity')}
              >
                Primeira vez? Cadastrar minha entidade
              </Button>
            )}

            {selectedRole === 'beneficiary' && (
              <Button
                type="button"
                variant="outline"
                size="large"
                fullWidth
                className="mt-2"
                onClick={() => navigate('/register-beneficiary')}
              >
                Primeira vez? Cadastrar minha família
              </Button>
            )}
          </form>

          <div className="separator my-6 flex items-center justify-center gap-3">
            <div className="h-px bg-outline/20 flex-1" />
            <span className="text-xs font-bold text-outline uppercase tracking-widest">ou</span>
            <div className="h-px bg-outline/20 flex-1" />
          </div>

          <button
            type="button"
            className="social-btn google active:scale-95 transition-transform w-full"
            disabled={isLoading}
            onClick={async () => {
              if (!selectedRole || selectedRole === 'beneficiary') {
                showToast('Use e-mail e senha para beneficiário, ou escolha Doador/Entidade para Google.', 'info');
                return;
              }
              setIsLoading(true);
              try {
                await login('google', selectedRole);
                showToast('Login com Google realizado!', 'success');
              } catch {
                showToast('Erro ao entrar com Google.', 'error');
                setIsLoading(false);
              }
            }}
          >
            <span className="google-icon">G</span>
            Entrar com Google
          </button>

          <div className="text-center mt-auto pb-4 pt-6">
            <p className="text-xs text-outline opacity-60">Acesso restrito.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-page role-picker-view">
      <div className="auth-hero">
        <div className="auth-hero-overlay"></div>
        <img
          src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
          alt="Criança sorrindo"
          className="auth-hero-image"
        />
        <div className="auth-hero-content">
          <MealfyLogo size="lg" className="auth-hero-logo" />
          <h1 className="text-3xl font-bold text-white leading-tight mb-2">Como você quer entrar?</h1>
          <p className="text-white/80 text-sm font-medium">Faça parte da nossa rede solidária.</p>
        </div>
      </div>

      <main className="auth-content p-6 flex-col">
        <div className="roles-list flex-col gap-4 mb-6">
          <button
            className="role-card-btn active:scale-95 transition-transform"
            onClick={() => handleRoleSelect('donor')}
          >
            <div className="role-icon-wrapper bg-primary/10 text-primary">
              <Heart size={24} />
            </div>
            <div className="role-card-text">
              <h3>Sou Doador</h3>
              <p>Acompanhe e doe para quem precisa</p>
            </div>
            <ArrowRight size={20} className="text-outline/40" />
          </button>

          <button
            className="role-card-btn active:scale-95 transition-transform"
            onClick={() => handleRoleSelect('entity')}
          >
            <div className="role-icon-wrapper bg-secondary/10 text-secondary">
              <Building2 size={24} />
            </div>
            <div className="role-card-text">
              <h3>Sou Entidade Autorizada</h3>
              <p>Faça a gestão de famílias cadastradas</p>
            </div>
            <ArrowRight size={20} className="text-outline/40" />
          </button>

          <button
            className="role-card-btn active:scale-95 transition-transform"
            onClick={() => handleRoleSelect('beneficiary')}
          >
            <div className="role-icon-wrapper bg-success/10 text-success">
              <UserCircle size={24} />
            </div>
            <div className="role-card-text">
              <h3>Sou Beneficiário</h3>
              <p>Cadastre sua família ou acesse o painel</p>
            </div>
            <ArrowRight size={20} className="text-outline/40" />
          </button>
        </div>

        <div className="separator mb-6 flex items-center justify-center gap-3">
          <div className="h-px bg-outline/20 flex-1"></div>
          <span className="text-xs font-bold text-outline uppercase tracking-widest">ou</span>
          <div className="h-px bg-outline/20 flex-1"></div>
        </div>

        <button
          className="social-btn facebook active:scale-95 transition-transform"
          onClick={() => socialService.openMealfyFacebook()}
        >
          <span className="facebook-icon">f</span>
          Entrar com Facebook
        </button>

        <div className="auth-footer mt-8 mb-4 text-center flex-col gap-6">
          <button
            className="text-primary font-bold flex items-center justify-center gap-2 mx-auto active:scale-95 transition-transform text-sm"
            onClick={() => navigate('/register')}
          >
            Criar conta
          </button>
          
          <button
            className="text-primary flex items-center justify-center gap-2 mx-auto active:scale-95 transition-transform text-sm"
            onClick={() => navigate('/donate')}
          >
            Continuar como anônimo <ArrowRight size={16} />
          </button>

          <button
            className="text-xs text-outline/60 underline underline-offset-2 hover:text-outline active:scale-95 transition-all mx-auto"
            onClick={() => handleRoleSelect('admin')}
          >
            Acesso administrativo restrito
          </button>
        </div>
      </main>
    </div>
  );
};

export default Auth;
