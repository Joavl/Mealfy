import { useEffect, useId, useRef, useState } from 'react';
import { KeyRound, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { ApiError } from '../../api/apiClient';
import { authApi, type StepUpAuthorization, type StepUpPurpose } from '../../api/authApi';
import Button from './Button';
import './StepUpAuthentication.css';

interface StepUpAuthenticationProps {
  purpose: StepUpPurpose;
  resourceId?: string;
  onAuthorized: (authorization: StepUpAuthorization) => void;
  onCancel?: () => void;
}

type Stage = 'password' | 'code' | 'success';

export default function StepUpAuthentication({ purpose, resourceId, onAuthorized, onCancel }: StepUpAuthenticationProps) {
  const passwordId = useId();
  const codeId = useId();
  const helpId = useId();
  const errorId = useId();
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('password');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { if (stage === 'code') codeInputRef.current?.focus(); }, [stage]);

  const requestCode = async () => {
    if (!password) { setError('Informe sua senha.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const challenge = await authApi.createStepUpChallenge(password, purpose, resourceId);
      setChallengeId(challenge.challengeId);
      setStage('code'); setCode('');
      setMessage('Enviamos um código de 6 dígitos ao seu e-mail verificado. Ele vale por 10 minutos.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível enviar o código agora.');
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!/^\d{6}$/.test(code)) { setError('Informe o código de 6 dígitos.'); return; }
    setBusy(true); setError('');
    try {
      const authorization = await authApi.confirmStepUpChallenge(challengeId, code, purpose, resourceId);
      setStage('success'); setPassword(''); setCode('');
      setMessage('Autenticação reforçada concluída. Continue a ação nos próximos 15 minutos.');
      onAuthorized(authorization);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível confirmar o código.');
    } finally { setBusy(false); }
  };

  return <section className="step-up-card" aria-labelledby="step-up-title">
    <div className="step-up-icon" aria-hidden="true">{stage === 'success' ? <ShieldCheck /> : stage === 'code' ? <MailCheck /> : <KeyRound />}</div>
    <div className="step-up-heading"><span>Proteção do Pix direto</span><h2 id="step-up-title">Confirme que é você</h2></div>
    {stage === 'password' && <form onSubmit={(event) => { event.preventDefault(); void requestCode(); }}>
      <label htmlFor={passwordId}>Senha atual</label>
      <input id={passwordId} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} aria-describedby={helpId + (error ? ' ' + errorId : '')} aria-invalid={Boolean(error)} aria-errormessage={error ? errorId : undefined} />
      <p id={helpId}>Depois da senha, enviaremos um código ao seu e-mail verificado.</p>
      <Button type="submit" fullWidth loading={busy}>Enviar código</Button>
    </form>}
    {stage === 'code' && <form onSubmit={(event) => { event.preventDefault(); void confirm(); }}>
      <label htmlFor={codeId}>Código de segurança</label>
      <input ref={codeInputRef} id={codeId} className="step-up-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={busy} aria-describedby={helpId + (error ? ' ' + errorId : '')} aria-invalid={Boolean(error)} aria-errormessage={error ? errorId : undefined} />
      <p id={helpId}>O código é de uso único e autoriza somente esta finalidade.</p>
      <Button type="submit" fullWidth loading={busy}>Confirmar código</Button>
      <Button type="button" variant="ghost" fullWidth disabled={busy} icon={<RefreshCw />} onClick={() => void requestCode()}>Reenviar código</Button>
    </form>}
    {message && <p className="step-up-message" role="status">{message}</p>}
    {error && <p id={errorId} className="step-up-error" role="alert">{error}</p>}
    {onCancel && stage !== 'success' && <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>Cancelar</Button>}
  </section>;
}
