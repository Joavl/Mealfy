import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { AuthError } from '../backend/services/authService';
import './Auth.css';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function mapAuthError(error: unknown): string {
  if (!(error instanceof AuthError)) return 'Não foi possível entrar agora. Tente novamente.';
  switch (error.code) {
    case 'invalid_credentials': return 'E-mail ou senha incorretos.';
    case 'account_pending': return 'Sua conta ainda está em análise.';
    case 'account_suspended': return 'Sua conta foi suspensa. Contate o suporte.';
    case 'network_error': return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    case 'provider_unavailable': return 'Nosso servidor está indisponível no momento. Tente novamente em instantes.';
    default: return 'Não foi possível entrar agora. Tente novamente.';
  }
}

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isAuthenticated, user } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const passwordRef = useRef<HTMLInputElement>(null);
  const emailError = touched.email && !isValidEmail(email) ? 'Informe um e-mail válido.' : '';
  const passwordError = touched.password && password.length < 8 ? 'A senha deve ter pelo menos 8 caracteres.' : '';

  const redirectAfterLogin = () => {
    const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
    return from?.pathname ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/dashboard-redirect';
  };

  useEffect(() => {
    if (isAuthenticated && user) navigate(redirectAfterLogin(), { replace: true });
  }, [isAuthenticated, user, navigate, location.state]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setFormError('');
    if (!isValidEmail(email) || password.length < 8 || isLoading) return;

    setIsLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      navigate(redirectAfterLogin(), { replace: true });
    } catch (error) {
      setFormError(mapAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page auth-login-page">
      <div className="auth-hero">
        <div className="auth-hero-overlay" />
        <img src="/images/login-hero.jpg" alt="" className="auth-hero-image" aria-hidden="true" />
        <div className="auth-hero-content">
          <div className="auth-brand" aria-label="Mealfy">Mealfy</div>
          <h1 className="auth-hero-title">Bem-vindo</h1>
          <p className="auth-hero-subtitle">Entre para continuar transformando conexões em impacto.</p>
        </div>
      </div>

      <main className="auth-form-panel" id="main-content">
        <form onSubmit={handleSubmit} noValidate aria-label="Formulário de login">
          <div className="auth-input-group">
            <label className="auth-input-label" htmlFor="auth-email">E-mail</label>
            <div className={`auth-input-wrapper ${emailError ? 'auth-input-wrapper--error' : ''}`}>
              <Mail size={18} className="auth-input-icon" aria-hidden="true" />
              <input id="auth-email" type="email" className="auth-input" placeholder="seu@email.com" value={email}
                onChange={(event) => { setEmail(event.target.value); setFormError(''); }}
                onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                autoComplete="email" autoCapitalize="none" autoCorrect="off" inputMode="email"
                aria-describedby={emailError ? 'email-error' : undefined} aria-invalid={Boolean(emailError)}
                onKeyDown={(event) => event.key === 'Enter' && passwordRef.current?.focus()} />
            </div>
            {emailError && <p id="email-error" className="auth-field-error" role="alert">{emailError}</p>}
          </div>

          <div className="auth-input-group">
            <div className="auth-label-row">
              <label className="auth-input-label" htmlFor="auth-password">Senha</label>
              <button type="button" className="auth-forgot-link" onClick={() => navigate('/forgot-password')}>Esqueci minha senha</button>
            </div>
            <div className={`auth-input-wrapper ${passwordError ? 'auth-input-wrapper--error' : ''}`}>
              <Lock size={18} className="auth-input-icon" aria-hidden="true" />
              <input id="auth-password" ref={passwordRef} type={showPassword ? 'text' : 'password'} className="auth-input auth-input--password" placeholder="••••••••" value={password}
                onChange={(event) => { setPassword(event.target.value); setFormError(''); }}
                onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                autoComplete="current-password" aria-describedby={passwordError ? 'password-error' : undefined} aria-invalid={Boolean(passwordError)} />
              <button type="button" className="auth-pwd-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordError && <p id="password-error" className="auth-field-error" role="alert">{passwordError}</p>}
          </div>

          {formError && <div className="auth-form-error" role="alert" aria-live="assertive">{formError}</div>}
          <button type="submit" className="auth-btn-primary" disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? <span className="auth-spinner" aria-hidden="true" /> : 'Entrar'}
          </button>
        </form>

        <p className="auth-register-prompt">Ainda não tem uma conta? <button type="button" className="auth-register-link" onClick={() => navigate('/register')}>Criar conta</button></p>
        <p className="auth-register-prompt">Ao continuar, você concorda com a nossa <button type="button" className="auth-register-link" onClick={() => navigate('/privacy')}>Política de Privacidade</button></p>
      </main>
    </div>
  );
};

export default Auth;
