import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, ShieldAlert, Users } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { entityApi } from '../api/entityApi';
import './EmailVerification.css';

type State = 'idle' | 'accepting' | 'accepted' | 'error';

export default function EntityOperatorInvitation() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token] = useState(() => params.get('token'));
  const attempted = useRef(false);
  const [state, setState] = useState<State>(token ? 'accepting' : 'idle');
  const [message, setMessage] = useState(token ? 'Validando o convite…' : 'Este convite não contém um código válido.');

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    navigate('/entity-operator-invitation', { replace: true });
    void entityApi.acceptInvitation(token)
      .then(() => {
        setState('accepted');
        setMessage('Convite aceito. Entre novamente para ativar sua nova sessão de operador.');
      })
      .catch((cause: unknown) => {
        setState('error');
        setMessage(cause instanceof Error ? cause.message : 'Não foi possível aceitar este convite.');
      });
  }, [navigate, token]);

  return <div className="email-verification-page">
    <AppHeader title="Convite de operador" showBack />
    <main className="email-verification-content">
      <section className="email-verification-card" aria-live="polite">
        <div className={state === 'accepted' ? 'verification-icon verified' : 'verification-icon'}>
          {state === 'accepted' ? <CheckCircle2 aria-hidden="true" /> : <Users aria-hidden="true" />}
        </div>
        <span className="verification-kicker">Acesso institucional</span>
        <h1>{state === 'accepted' ? 'Vínculo ativado' : 'Aceitando convite'}</h1>
        {state === 'accepting' && <div className="verification-status"><Clock3 aria-hidden="true" /> Validando identidade e entidade…</div>}
        <p className={state === 'error' ? 'verification-message error' : 'verification-message'} role={state === 'error' ? 'alert' : 'status'}>{message}</p>
        {state === 'accepted' && <Button fullWidth size="large" onClick={() => navigate('/auth', { replace: true })}>Entrar novamente</Button>}
        {state !== 'accepted' && <aside className="verification-note"><ShieldAlert aria-hidden="true" /><span>O convite só pode ser aceito pela conta verificada cujo e-mail recebeu a mensagem.</span></aside>}
      </section>
    </main>
  </div>;
}
