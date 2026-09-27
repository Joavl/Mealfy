import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, MailCheck, RefreshCw, ShieldAlert } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { authService } from '../backend/services/authService';
import './EmailVerification.css';

type State = 'idle' | 'sending' | 'sent' | 'confirming' | 'verified' | 'error';

export default function EmailVerification() {
  const { user, fetchSession } = useAppContext();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tokenRef = useRef(params.get('token'));
  const token = tokenRef.current;
  const [state, setState] = useState<State>(user?.emailVerifiedAt ? 'verified' : token ? 'confirming' : 'idle');
  const [message, setMessage] = useState('');
  const attemptedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token || !user || attemptedToken.current === token || user.emailVerifiedAt) return;
    attemptedToken.current = token;
    navigate('/verify-email', { replace: true });
    setState('confirming');
    void authService.confirmEmailVerification(token)
      .then(async () => {
        await fetchSession();
        setState('verified');
        setMessage('Seu e-mail foi confirmado. Essa etapa de segurança está concluída.');
      })
      .catch((cause: unknown) => {
        setState('error');
        setMessage(cause instanceof Error ? cause.message : 'Não foi possível confirmar este link.');
      });
  }, [fetchSession, navigate, token, user]);

  const send = async () => {
    if (!user) return;
    setState('sending');
    setMessage('');
    try {
      await authService.requestEmailVerification(user.email);
      setState('sent');
      setMessage('Se o endereço puder receber a mensagem, enviaremos um link temporário. Confira também o spam.');
    } catch (cause) {
      setState('error');
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível solicitar a verificação agora.');
    }
  };

  const verified = state === 'verified' || Boolean(user?.emailVerifiedAt);
  return (
    <div className="email-verification-page">
      <AppHeader title="Verificação de e-mail" showBack />
      <main className="email-verification-content">
        <section className="email-verification-card" aria-live="polite">
          <div className={verified ? 'verification-icon verified' : 'verification-icon'}>
            {verified ? <CheckCircle2 aria-hidden="true" /> : <MailCheck aria-hidden="true" />}
          </div>
          <span className="verification-kicker">Proteção da conta</span>
          <h1>{verified ? 'E-mail verificado' : 'Confirme seu acesso ao e-mail'}</h1>
          <p>{verified
            ? 'Você já comprovou acesso a este endereço.'
            : 'Essa confirmação é necessária antes de acessar dados protegidos do Pix direto.'}</p>
          <div className="verification-address">{user?.email}</div>

          {!verified && state !== 'confirming' && (
            <Button fullWidth size="large" loading={state === 'sending'} onClick={send} icon={state === 'sent' ? <RefreshCw /> : <MailCheck />}>
              {state === 'sent' ? 'Reenviar link' : 'Enviar link de verificação'}
            </Button>
          )}
          {state === 'confirming' && <div className="verification-status"><Clock3 aria-hidden="true" /> Confirmando o link…</div>}
          {message && <p className={state === 'error' ? 'verification-message error' : 'verification-message'} role={state === 'error' ? 'alert' : 'status'}>{message}</p>}

          {!verified && (
            <aside className="verification-note">
              <ShieldAlert aria-hidden="true" />
              <span>Por segurança, cada reenvio invalida o link anterior. O link é de uso único e expira automaticamente.</span>
            </aside>
          )}
        </section>
      </main>
    </div>
  );
}
