import React, { useEffect, useState } from 'react';
import { Send, Check } from 'lucide-react';
import BottomSheet from './BottomSheet';
import Button from './Button';
import { donationsApi, type MessageTemplate } from '../../api/donationsApi';
import { useToast } from '../../context/ToastContext';
import './MessagePicker.css';

interface MessagePickerProps {
  isOpen: boolean;
  onClose: () => void;
  donationId: string;
  /** Qual lista carregar. O servidor valida de novo pelo vínculo real. */
  audience: 'donor' | 'beneficiary';
  title: string;
  subtitle: string;
  /** Chave já enviada antes, para reabrir com a escolha marcada. */
  currentKey?: string | null;
  onSent?: (body: string) => void;
}

/**
 * Escolha de uma mensagem pré-definida para enviar em uma doação.
 *
 * Sem campo de texto livre de propósito: o remetente é um estranho e o
 * destinatário costuma estar em situação de vulnerabilidade — texto aberto
 * exigiria moderação, que o projeto não tem. Escolher entre opções prontas
 * também torna o envio mais rápido, que é o objetivo aqui.
 */
const MessagePicker: React.FC<MessagePickerProps> = ({
  isOpen,
  onClose,
  donationId,
  audience,
  title,
  subtitle,
  currentKey,
  onSent,
}) => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[] | null>(null);
  const [selected, setSelected] = useState<string | null>(currentKey ?? null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelected(currentKey ?? null);
    let active = true;
    donationsApi
      .getMessageTemplates()
      .then((r) => { if (active) setTemplates(r.templates[audience] ?? []); })
      .catch(() => { if (active) setTemplates([]); });
    return () => { active = false; };
  }, [isOpen, audience, currentKey]);

  const handleSend = async () => {
    if (!selected || isSending) return;
    setIsSending(true);
    try {
      await donationsApi.sendMessage(donationId, selected);
      const body = templates?.find((t) => t.key === selected)?.body ?? '';
      showToast('Mensagem enviada!', 'success');
      onSent?.(body);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível enviar agora.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <p className="msg-picker-subtitle">{subtitle}</p>

      {templates === null ? (
        <p className="msg-picker-loading">Carregando mensagens...</p>
      ) : templates.length === 0 ? (
        <p className="msg-picker-loading">Nenhuma mensagem disponível agora.</p>
      ) : (
        <div className="msg-picker-list" role="radiogroup" aria-label={title}>
          {templates.map((t) => {
            const isActive = selected === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={`msg-picker-option ${isActive ? 'msg-picker-option--active' : ''}`}
                onClick={() => setSelected(t.key)}
              >
                <span className="msg-picker-text">{t.body}</span>
                {isActive && <Check size={18} className="msg-picker-check" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="msg-picker-actions">
        <Button variant="outline" onClick={onClose} disabled={isSending}>
          Agora não
        </Button>
        <Button
          variant="primary"
          icon={<Send size={16} />}
          onClick={handleSend}
          disabled={!selected || isSending}
        >
          {isSending ? 'Enviando...' : 'Enviar'}
        </Button>
      </div>
    </BottomSheet>
  );
};

export default MessagePicker;
