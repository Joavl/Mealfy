import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import Button from '../components/ui/Button';
import { paymentsApi } from '../api/donationsApi';
import { useToast } from '../context/ToastContext';
import './Success.css';

type PixFlowState = {
  pixResult?: {
    donation?: { id?: string };
    payment?: {
      id?: string;
      pixCopyPaste?: string | null;
      expiresAt?: string | null;
    };
    familyName?: string;
  };
  totalAmount?: number;
};

const Success: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [isCheckingPix, setIsCheckingPix] = useState(false);
  const state = location.state as PixFlowState | null;
  const pixResult = state?.pixResult;
  const payment = pixResult?.payment;

  // Resultados montados no cliente não são uma confirmação financeira.
  if (!pixResult?.donation?.id || !payment?.id) {
    navigate('/', { replace: true });
    return null;
  }

  const paymentId = payment.id;
  const expiresAt = payment.expiresAt ? new Date(payment.expiresAt) : null;
  const formattedAmount = typeof state?.totalAmount === 'number'
    ? state.totalAmount.toFixed(2)
    : '—';

  const copyPixCode = async () => {
    if (!payment.pixCopyPaste) return;
    try {
      await navigator.clipboard.writeText(payment.pixCopyPaste);
      showToast('Código Pix copiado! Cole no app do seu banco.', 'success');
    } catch {
      showToast('Não foi possível copiar o código Pix.', 'error');
    }
  };

  const checkPixStatus = async () => {
    setIsCheckingPix(true);
    try {
      const response = await paymentsApi.getPayment(paymentId);
      const status = response?.payment?.status ?? response?.status;

      if (status === 'paid') {
        showToast('Pagamento confirmado pelo servidor. O vale será tratado pelo fluxo autoritativo.', 'success');
        navigate('/map', { replace: true });
      } else if (['expired', 'failed', 'canceled'].includes(status)) {
        showToast('Esta cobrança não está mais disponível. Tente doar novamente.', 'error');
      } else {
        showToast('Pagamento ainda não confirmado. Nenhum vale foi emitido até a confirmação do backend.', 'info');
      }
    } catch {
      showToast('Não foi possível consultar agora. O status permanece desconhecido; nenhum vale foi emitido.', 'error');
    } finally {
      setIsCheckingPix(false);
    }
  };

  return (
    <div className="success-page">
      <main className="success-hero flex flex-col items-center justify-center text-center p-4">
        <div className="success-icon-container mb-4">
          <div className="success-icon-bg bg-success"><Check size={48} color="white" /></div>
        </div>
        <h1 className="success-title text-primary mb-2">Aguardando pagamento</h1>
        <p className="success-subtitle text-outline mb-6">
          Pague o Pix abaixo. A doação, a família atendida e qualquer vale só são confirmados
          depois que o backend receber e processar a confirmação do pagamento.
        </p>

        <section className="receipt-card mb-6" aria-label="Detalhes da cobrança Pix">
          <div className="receipt-row"><span className="receipt-label">Valor do Pix</span><span className="receipt-value text-secondary">R$ {formattedAmount}</span></div>
          <div className="receipt-divider" />
          <div className="receipt-row"><span className="receipt-label">Família</span><span className="receipt-value">{pixResult.familyName ?? '—'}</span></div>
          {expiresAt && <><div className="receipt-divider" /><div className="receipt-row"><span className="receipt-label">Válido até</span><span className="receipt-value">{expiresAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div></>}
          <div className="receipt-divider" />
          <div className="receipt-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}><span className="receipt-label">Pix copia e cola</span><span className="receipt-value font-mono text-xs" style={{ wordBreak: 'break-all' }}>{payment.pixCopyPaste ?? 'Indisponível'}</span></div>
          <div className="receipt-divider" />
          <div className="receipt-row"><span className="receipt-label">Status</span><span className="receipt-value text-secondary font-bold">Aguardando confirmação</span></div>
        </section>

        <div className="flex flex-col gap-3 w-full mb-4">
          <Button size="large" fullWidth icon={<Copy size={18} />} onClick={copyPixCode} disabled={!payment.pixCopyPaste}>Copiar código Pix</Button>
          <Button variant="outline" fullWidth loading={isCheckingPix} onClick={checkPixStatus}>Já paguei — verificar status</Button>
          <Button variant="outline" fullWidth onClick={() => navigate('/map')}>Voltar ao mapa</Button>
        </div>
      </main>
    </div>
  );
};

export default Success;
