import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Check, Share2, History, HeartHandshake, Copy, MessageCircle, AtSign, Mail, Send } from 'lucide-react';
import BottomSheet from '../components/ui/BottomSheet';
import { useToast } from '../context/ToastContext';
import { PROVIDER_LABELS } from '../backend/mockData/giftCardInventory';
import { paymentsApi, donationsApi, type MessageTemplate } from '../api/donationsApi';
import './Success.css';

const Success: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCheckingPix, setIsCheckingPix] = useState(false);

  // Mensagens vêm do backend (fonte única). Antes eram um array fixo aqui e a
  // escolha não era enviada a lugar nenhum — a tela sugeria um recado à família
  // que nunca saía do dispositivo.
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    donationsApi
      .getMessageTemplates()
      .then((r) => { if (active) setMessageTemplates(r.templates.donor ?? []); })
      .catch(() => { if (active) setMessageTemplates([]); });
    return () => { active = false; };
  }, []);

  // Read data passed from DonationChoice or BigDonation
  const donationResult = location.state?.donationResult as any;
  const pixResult = location.state?.pixResult as any;
  const totalAmount = location.state?.totalAmount as number | undefined;

  // If user accesses /success directly, send back
  if (!donationResult && !pixResult) {
    navigate('/');
    return null;
  }

  const pixPayment = pixResult?.payment;
  const pixExpiresAt = pixPayment?.expiresAt ? new Date(pixPayment.expiresAt) : null;

  const copyPixCode = () => {
    if (!pixPayment?.pixCopyPaste) return;
    navigator.clipboard.writeText(pixPayment.pixCopyPaste);
    showToast('Código Pix copiado! Cole no app do seu banco.', 'success');
  };

  const checkPixStatus = async () => {
    if (!pixPayment?.id) return;
    setIsCheckingPix(true);
    try {
      const resp = await paymentsApi.getPayment(pixPayment.id);
      const status = resp?.payment?.status ?? resp?.status;
      if (status === 'paid') {
        showToast('Pagamento confirmado! O vale foi enviado para a família. 💚', 'success');
        navigate('/map');
      } else if (status === 'expired' || status === 'failed' || status === 'canceled') {
        showToast('Esta cobrança não está mais disponível. Tente doar novamente.', 'error');
      } else {
        showToast('Pagamento ainda não identificado. Assim que o banco confirmar, o vale é liberado.', 'info');
      }
    } catch {
      showToast('Não foi possível verificar agora. Tente novamente.', 'error');
    } finally {
      setIsCheckingPix(false);
    }
  };

  // Id da doação real — só existe no fluxo de API. O caminho mock local não
  // gera doação no servidor, e sem ela não há para onde enviar mensagem.
  const donationId: string | undefined = pixResult?.donation?.id;

  const handleSendMessage = async () => {
    if (!donationId || selectedMessage === null || isSendingMessage) return;
    const template = messageTemplates[selectedMessage];
    if (!template) return;

    setIsSendingMessage(true);
    try {
      await donationsApi.sendMessage(donationId, template.key);
      setSentMessage(template.body);
      showToast('Mensagem enviada para a família!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível enviar a mensagem.', 'error');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText('https://mealfy.com');
    showToast('Link de compartilhamento copiado!', 'success');
    setIsShareModalOpen(false);
  };

  return (
    <div className="success-page">
      <div className="success-hero flex flex-col items-center justify-center text-center p-4">
        <div className="success-icon-container mb-4">
          <div className="success-icon-bg bg-success">
            <Check size={48} color="white" />
          </div>
        </div>
        <h1 className="success-title text-primary mb-2">{pixResult ? 'Quase lá!' : 'Muito obrigado!'}</h1>

        {pixResult ? (
          <p className="success-subtitle text-outline mb-6">
            Pague o Pix abaixo para concluir. Assim que o banco confirmar, o vale é enviado
            direto para a família de <strong>{pixResult.familyName}</strong> — você acompanha
            tudo pelo mapa.
          </p>
        ) : (
          <p className="success-subtitle text-outline mb-6">
            Seu apoio foi transformado imediatamente no <strong>{donationResult.giftCard.label}</strong> e designado para a família de <strong>{donationResult.familyAssigned.representativeName}</strong>.
          </p>
        )}

        {pixResult ? (
          <div className="receipt-card mb-6">
            <div className="receipt-row">
              <span className="receipt-label">Valor do Pix</span>
              <span className="receipt-value text-secondary">R$ {totalAmount ? totalAmount.toFixed(2) : '35,00'}</span>
            </div>
            <div className="receipt-divider"></div>
            <div className="receipt-row">
              <span className="receipt-label">Família</span>
              <span className="receipt-value">{pixResult.familyName}</span>
            </div>
            <div className="receipt-divider"></div>
            {pixExpiresAt && (
              <>
                <div className="receipt-row">
                  <span className="receipt-label">Válido até</span>
                  <span className="receipt-value">{pixExpiresAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="receipt-divider"></div>
              </>
            )}
            <div className="receipt-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <span className="receipt-label">Pix copia e cola</span>
              <span className="receipt-value font-mono text-xs" style={{ wordBreak: 'break-all' }}>{pixPayment?.pixCopyPaste || 'Indisponível'}</span>
            </div>
            <div className="receipt-divider"></div>
            <div className="receipt-row">
              <span className="receipt-label">Status</span>
              <span className="receipt-value text-secondary font-bold">Aguardando pagamento</span>
            </div>
          </div>
        ) : (
          <div className="receipt-card mb-6">
            <div className="receipt-row">
              <span className="receipt-label">Valor do Apoio</span>
              <span className="receipt-value text-secondary">R$ {totalAmount ? totalAmount.toFixed(2) : '35,00'}</span>
            </div>
            <div className="receipt-divider"></div>
            <div className="receipt-row">
              <span className="receipt-label">Destinatário</span>
              <span className="receipt-value">{donationResult.familyAssigned.representativeName}</span>
            </div>
            <div className="receipt-divider"></div>
            <div className="receipt-row">
              <span className="receipt-label">Plataforma</span>
              <span className="receipt-value font-bold text-primary">{PROVIDER_LABELS[donationResult.giftCard.provider as 'ifood' | '99' | 'carrefour'] || donationResult.giftCard.provider}</span>
            </div>
            <div className="receipt-divider"></div>
            <div className="receipt-row">
              <span className="receipt-label">Código Vale</span>
              <span className="receipt-value font-mono font-bold text-primary">{donationResult.giftCard.code}</span>
            </div>
            <div className="receipt-divider"></div>
            <div className="receipt-row">
              <span className="receipt-label">Status</span>
              <span className="receipt-value text-success font-bold">Gerado & Disponível</span>
            </div>
          </div>
        )}

        {pixResult && (
          <div className="flex flex-col gap-3 w-full mb-4">
            <Button
              size="large"
              fullWidth
              icon={<Copy size={18} />}
              onClick={copyPixCode}
              disabled={!pixPayment?.pixCopyPaste}
            >
              Copiar código Pix
            </Button>
            <Button
              variant="outline"
              fullWidth
              loading={isCheckingPix}
              onClick={checkPixStatus}
            >
              Já paguei — verificar status
            </Button>
          </div>
        )}
      </div>

      {donationId && (
        <div className="message-section p-4">
          <h3 className="section-title mb-3 text-primary">Envie uma mensagem de força</h3>

          {sentMessage ? (
            <div className="msg-note" role="status">
              <span className="msg-note-label">Mensagem enviada</span>
              <p className="msg-note-body">"{sentMessage}"</p>
            </div>
          ) : (
            <>
              <p className="section-desc mb-4">
                Escolha uma mensagem para acompanhar seu apoio. A família vê junto com o vale.
              </p>

              <div className="message-options flex flex-col gap-3 mb-4" role="radiogroup" aria-label="Mensagem para a família">
                {messageTemplates.map((msg, index) => (
                  <button
                    key={msg.key}
                    type="button"
                    role="radio"
                    aria-checked={selectedMessage === index}
                    className={`message-card p-3 rounded border flex items-center gap-3 cursor-pointer transition-all text-left w-full ${
                      selectedMessage === index ? 'border-primary bg-primary/5' : 'border-outline/10 bg-white'
                    }`}
                    onClick={() => setSelectedMessage(index)}
                  >
                    <HeartHandshake size={20} className={selectedMessage === index ? 'text-primary' : 'text-outline'} />
                    <span className="message-text text-sm text-text-main">{msg.body}</span>
                  </button>
                ))}
              </div>

              <Button
                variant="primary"
                fullWidth
                icon={<Send size={16} />}
                onClick={handleSendMessage}
                disabled={selectedMessage === null || isSendingMessage}
                className="mb-6"
              >
                {isSendingMessage ? 'Enviando...' : 'Enviar mensagem'}
              </Button>
            </>
          )}
        </div>
      )}

      <div className="p-4">

        <div className="action-buttons flex flex-col gap-3">
          <Button 
            className="shadow-glow" 
            size="large" 
            fullWidth
            onClick={() => navigate('/map')}
          >
            Acompanhar no mapa regional
          </Button>
          
          <div className="secondary-actions flex gap-3 mt-2">
            <Button 
              variant="outline" 
              fullWidth 
              icon={<Share2 size={18} />}
              onClick={() => setIsShareModalOpen(true)}
            >
              Compartilhar
            </Button>
            <Button 
              variant="outline" 
              fullWidth 
              icon={<History size={18} />}
              onClick={() => navigate('/profile')}
            >
              Meu Perfil
            </Button>
          </div>
        </div>
      </div>

      {/* Share BottomSheet */}
      <BottomSheet isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Compartilhar Conquista">
        <p className="text-sm text-outline mb-6">Mostre aos seus amigos como você está ajudando a combater a fome infantil hoje!</p>
        
        <div className="flex flex-col gap-3">
          <button 
            className="flex items-center gap-3 p-4 bg-surface rounded-md border border-outline/10 text-left hover:bg-surface-highest transition-all"
            onClick={() => { showToast('Simulando envio pelo WhatsApp...', 'info'); setIsShareModalOpen(false); }}
          >
            <MessageCircle size={20} className="text-success" />
            <span className="font-semibold text-sm">Enviar no WhatsApp</span>
          </button>
          
          <button 
            className="flex items-center gap-3 p-4 bg-surface rounded-md border border-outline/10 text-left hover:bg-surface-highest transition-all"
            onClick={() => { showToast('Simulando postagem no Instagram Stories...', 'info'); setIsShareModalOpen(false); }}
          >
            <AtSign size={20} className="text-secondary" />
            <span className="font-semibold text-sm">Compartilhar no Stories</span>
          </button>
          
          <button 
            className="flex items-center gap-3 p-4 bg-surface rounded-md border border-outline/10 text-left hover:bg-surface-highest transition-all"
            onClick={() => { showToast('Simulando envio por E-mail...', 'info'); setIsShareModalOpen(false); }}
          >
            <Mail size={20} className="text-primary" />
            <span className="font-semibold text-sm">Enviar por E-mail</span>
          </button>

          <button 
            className="flex items-center gap-3 p-4 bg-surface rounded-md border border-outline/10 text-left hover:bg-surface-highest transition-all"
            onClick={copyShareLink}
          >
            <Copy size={20} className="text-outline" />
            <span className="font-semibold text-sm">Copiar Link</span>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default Success;
