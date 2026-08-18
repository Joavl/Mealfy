import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { authService } from '../backend/services/authService';
import './ForgotPassword.css';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!validateEmail(email)) {
      setEmailError('Informe um e-mail válido.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(email.trim().toLowerCase());
      setSubmitted(true);
    } catch {
      // Mesmo em caso de erro interno, exibimos a mensagem neutra
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fp-page">
      <div className="fp-header">
        <button
          className="fp-back-btn"
          onClick={() => navigate('/auth')}
          aria-label="Voltar para login"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="fp-title">Recuperar senha</h1>
      </div>

      <div className="fp-content">
        {submitted ? (
          <div className="fp-success">
            <div className="fp-success-icon" aria-hidden="true">
              <Mail size={32} />
            </div>
            <h2 className="fp-success-title">Instruções enviadas</h2>
            <p className="fp-success-text">
              Se houver uma conta vinculada a este e-mail, você receberá instruções de
              recuperação em breve.
            </p>
            <button
              className="fp-btn-back-login"
              onClick={() => navigate('/auth')}
            >
              Voltar para o login
            </button>
          </div>
        ) : (
          <>
            <p className="fp-description">
              Informe o e-mail da sua conta e enviaremos as instruções para redefinir a senha.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="fp-field">
                <label className="fp-label" htmlFor="fp-email">
                  E-mail
                </label>
                <div className={`fp-input-wrapper ${emailError ? 'fp-input-error' : ''}`}>
                  <Mail size={18} className="fp-input-icon" aria-hidden="true" />
                  <input
                    id="fp-email"
                    type="email"
                    className="fp-input"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                    aria-describedby={emailError ? 'fp-email-error' : undefined}
                  />
                </div>
                {emailError && (
                  <p id="fp-email-error" className="fp-error-msg" role="alert">
                    {emailError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="fp-btn-submit"
                disabled={isLoading || !email}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <span className="fp-spinner" aria-hidden="true" />
                ) : (
                  'Enviar instruções'
                )}
              </button>
            </form>

            <button
              className="fp-btn-cancel"
              onClick={() => navigate('/auth')}
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
