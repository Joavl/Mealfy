import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, HandCoins, ReceiptText, ShieldCheck } from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { ApiError } from '../api/apiClient';
import { directPixApi, type DirectPixTerms } from '../api/directPixApi';
import './DirectPixTerms.css';

function newIdempotencyKey(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `terms-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function DirectPixTerms() {
  const [terms, setTerms] = useState<DirectPixTerms | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    directPixApi.getCurrentTerms()
      .then(({ terms: current }) => { if (active) setTerms(current); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os termos.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const accept = async () => {
    if (!terms || !understood) return;
    idempotencyKey.current ??= newIdempotencyKey();
    setSubmitting(true);
    setError('');
    try {
      const { acceptance } = await directPixApi.acceptTerms(terms.version, idempotencyKey.current);
      setTerms((current) => current ? { ...current, acceptedAt: acceptance.acceptedAt } : current);
      idempotencyKey.current = null;
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'terms_version_not_current') {
        idempotencyKey.current = null;
        setUnderstood(false);
        try {
          const { terms: current } = await directPixApi.getCurrentTerms();
          setTerms(current);
          setError('Os termos foram atualizados. Leia a nova versão antes de confirmar.');
        } catch {
          setError('Os termos foram atualizados. Recarregue a página para consultar a nova versão.');
        }
      } else {
        setError(cause instanceof ApiError ? cause.message : 'Não foi possível confirmar o aceite. Tente novamente com segurança.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="direct-pix-terms-page">
      <AppHeader title="Pix direto" showBack />
      <main className="direct-pix-terms-content">
        <section className="direct-pix-terms-hero">
          <span className="direct-pix-kicker">Antes de continuar</span>
          <h1>Entenda como funciona o Pix direto</h1>
          <p>A Mealfy aproxima você da família, mas não recebe nem movimenta o valor transferido.</p>
        </section>

        <section className="direct-pix-facts" aria-label="Informações importantes sobre o Pix direto">
          <article><HandCoins aria-hidden="true" /><div><strong>Vai direto ao responsável</strong><p>O dinheiro sai do seu banco diretamente para a conta do responsável familiar.</p></div></article>
          <article><ShieldCheck aria-hidden="true" /><div><strong>Não é verificado pela Mealfy</strong><p>A Mealfy não confirma a realização nem a liquidação da transferência.</p></div></article>
          <article><ReceiptText aria-hidden="true" /><div><strong>Não gera recibo fiscal</strong><p>Por ser uma transferência direta, a Mealfy não emite recibo fiscal do valor.</p></div></article>
        </section>

        {loading && <p role="status" className="direct-pix-state">Carregando a versão vigente…</p>}
        {error && <p role="alert" className="direct-pix-error">{error}</p>}

        {terms && (
          <section className="direct-pix-contract" aria-labelledby="direct-pix-contract-title">
            <div><h2 id="direct-pix-contract-title">{terms.title}</h2><span>Versão {terms.version}</span></div>
            <ul>{terms.statements.map((statement) => <li key={statement}>{statement}</li>)}</ul>

            {terms.acceptedAt ? (
              <div className="direct-pix-accepted" role="status"><CheckCircle2 aria-hidden="true" /><span>Aceite registrado em {new Date(terms.acceptedAt).toLocaleString('pt-BR')}.</span></div>
            ) : (
              <>
                <label className="direct-pix-confirmation">
                  <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} />
                  <span>Li e entendi que devo conferir o titular e o valor no aplicativo do meu banco antes de transferir.</span>
                </label>
                <Button fullWidth size="large" disabled={!understood} loading={submitting} onClick={accept}>
                  Aceitar termos do Pix direto
                </Button>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
