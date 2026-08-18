import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { ShieldAlert } from 'lucide-react';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="unauthorized-page flex-col items-center justify-center p-6 text-center" style={{ height: '80vh' }}>
      <AppHeader title="Acesso Negado" showBack />
      <div className="mb-6 text-error">
        <ShieldAlert size={80} />
      </div>
      <h1 className="text-2xl font-bold mb-2">Ops! Acesso restrito.</h1>
      <p className="text-outline mb-8">
        Você não tem permissão para acessar esta área com seu perfil atual.
      </p>
      <Button variant="primary" fullWidth onClick={() => navigate('/dashboard-redirect')}>
        Ir para Meu Painel
      </Button>
    </div>
  );
};

export default Unauthorized;
