import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { ClockIcon, Home } from 'lucide-react';

/**
 * IndicateFamily — Indicação de famílias (funcionalidade desabilitada)
 *
 * Esta funcionalidade será implementada em uma próxima atualização.
 * A rota /indicate-family é mantida mas o formulário ativo foi substituído
 * por um estado de indisponibilidade conforme decisão da Fase 2.
 */
const IndicateFamily: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: 'var(--color-background)',
      }}
    >
      <AppHeader title="Indicação de famílias" showBack onBack={() => navigate(-1)} />

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        {/* Ícone */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(var(--color-primary-rgb), 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
          aria-hidden="true"
        >
          <ClockIcon size={32} color="var(--color-primary)" strokeWidth={1.5} />
        </div>

        {/* Título */}
        <h1
          style={{
            fontFamily: 'var(--font-family-heading)',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--color-text-main)',
            marginBottom: 12,
            lineHeight: 1.2,
          }}
        >
          Indicação de famílias
        </h1>

        {/* Mensagem */}
        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--color-outline)',
            lineHeight: 1.6,
            maxWidth: 320,
            marginBottom: 32,
          }}
        >
          Estamos preparando uma forma segura de indicar famílias para análise.
          Esta funcionalidade estará disponível em uma próxima atualização.
        </p>

        {/* Ação */}
        <Button
          variant="outline"
          icon={<Home size={18} />}
          onClick={() => navigate('/')}
        >
          Voltar ao início
        </Button>
      </main>
    </div>
  );
};

export default IndicateFamily;
