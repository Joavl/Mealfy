import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../backend/services/authService';
import './ForgotPassword.css';

export default function ResetPassword(): React.ReactElement {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const token = params.get('token') || '';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!token) return setError('O link de redefinição é inválido ou expirou.');
    if (password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.');
    if (password !== confirm) return setError('As senhas não coincidem.');
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      navigate('/auth', { replace: true, state: { passwordReset: true } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível redefinir a senha.');
    } finally { setLoading(false); }
  };

  return <div className="fp-page"><div className="fp-content"><h1 className="fp-title">Criar nova senha</h1><form onSubmit={submit} noValidate>
    <div className="fp-field"><label className="fp-label" htmlFor="new-password">Nova senha</label><input id="new-password" type="password" className="fp-input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div>
    <div className="fp-field"><label className="fp-label" htmlFor="confirm-password">Confirme a nova senha</label><input id="confirm-password" type="password" className="fp-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></div>
    {error && <p className="fp-error-msg" role="alert">{error}</p>}<button className="fp-btn-submit" disabled={loading}>{loading ? 'Redefinindo...' : 'Redefinir senha'}</button>
  </form></div></div>;
}
