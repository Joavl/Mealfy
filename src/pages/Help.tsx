import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import { Heart, Compass, CreditCard, ShieldAlert } from 'lucide-react';
import './Support.css';

const Help: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="support-page">
      <AppHeader title="Guia do Aplicativo" showBack onBack={() => navigate(-1)} />
      
      <main className="content p-4">
        <h1 className="page-title text-primary mb-2">Primeiros Passos</h1>
        <p className="page-subtitle mb-6">Aprenda a utilizar o ecossistema Mealfy para extrair o máximo de impacto social.</p>

        <div className="flex-col gap-4">
          <div className="faq-item flex gap-3 items-start">
            <Compass size={24} className="text-secondary shrink-0 mt-1" />
            <div>
              <h4 className="faq-question">1. Explorando Regiões</h4>
              <p className="faq-answer">Navegue na aba "Explorar" para descobrir as comunidades com alertas de urgência. Você pode abrir o Raio-X da comunidade e ver o nível individual de cada família mapeada.</p>
            </div>
          </div>

          <div className="faq-item flex gap-3 items-start">
            <ShieldAlert size={24} className="text-primary shrink-0 mt-1" />
            <div>
              <h4 className="faq-question">2. Apoio regional iFood</h4>
              <p className="faq-answer">Para agir mais rápido, use o <strong>Apoio Regional</strong>. O sistema fraciona o valor e gera vários créditos iFood para famílias necessitadas da região ao mesmo tempo.</p>
            </div>
          </div>

          <div className="faq-item flex gap-3 items-start">
            <Heart size={24} className="text-error shrink-0 mt-1" />
            <div>
              <h4 className="faq-question">3. O Sistema Gamificado</h4>
              <p className="faq-answer">Seu total de Doações acumula "Pontos de Impacto". Visite o seu <strong>Meu Ranking Exclusivo</strong> no Perfil para monitorar e competir no bem frente a outros doadores.</p>
            </div>
          </div>

          <div className="faq-item flex gap-3 items-start">
            <CreditCard size={24} className="text-success shrink-0 mt-1" />
            <div>
              <h4 className="faq-question">4. Assinantes</h4>
              <p className="faq-answer">A jornada constante é mais poderosa. Vá na sua aba "Recorrência Mensal" e cadastre cobranças que automatizam a caça aos corações partidos periodicamente pelo Back-End.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Help;
