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
        <p className="page-subtitle mb-6">Aprenda a utilizar o ecossistema Mealfy para combater a fome infantil em sua região.</p>

        <div className="flex flex-col gap-3">
          <div className="faq-item flex gap-3 items-start p-4 bg-white border border-outline-variant/30 rounded">
            <Compass size={24} className="text-secondary shrink-0 mt-1" />
            <div>
              <h4 className="faq-question font-bold text-primary text-sm mb-1">1. Explorando o Mapa</h4>
              <p className="faq-answer text-xs text-outline leading-relaxed">
                Navegue na aba "Mapa" para ver a distribuição geográfica de famílias sinalizadas. É possível filtrar por bairro, urgência e ver os relatos de cada representante.
              </p>
            </div>
          </div>

          <div className="faq-item flex gap-3 items-start p-4 bg-white border border-outline-variant/30 rounded">
            <ShieldAlert size={24} className="text-primary shrink-0 mt-1" />
            <div>
              <h4 className="faq-question font-bold text-primary text-sm mb-1">2. O Poder do Apoio Ampliado</h4>
              <p className="faq-answer text-xs text-outline leading-relaxed">
                Para acelerar o impacto em grande escala, utilize a opção de <strong>Apoio Ampliado (Apoio Regional)</strong>. O sistema distribui o valor automaticamente entre as famílias de maior necessidade.
              </p>
            </div>
          </div>

          <div className="faq-item flex gap-3 items-start p-4 bg-white border border-outline-variant/30 rounded">
            <Heart size={24} className="text-error shrink-0 mt-1" />
            <div>
              <h4 className="faq-question font-bold text-primary text-sm mb-1">3. Sistema de Patentes e Impacto</h4>
              <p className="faq-answer text-xs text-outline leading-relaxed">
                Cada contribuição concluída ajuda a subir seu nível no perfil. Conquiste insígnias como "Pioneiro" ou "Guardião Regional" e lidere as tabelas de impacto.
              </p>
            </div>
          </div>

          <div className="faq-item flex gap-3 items-start p-4 bg-white border border-outline-variant/30 rounded">
            <CreditCard size={24} className="text-success shrink-0 mt-1" />
            <div>
              <h4 className="faq-question font-bold text-primary text-sm mb-1">4. Apoio Recorrente</h4>
              <p className="faq-answer text-xs text-outline leading-relaxed">
                Mantenha a ajuda ativa. Habilite a assinatura de apoios mensais na aba "Recorrência" para garantir que as cozinhas e vales-refeição das crianças permaneçam abastecidos.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Help;
