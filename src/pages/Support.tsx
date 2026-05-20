import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { MessageSquare, Mail, AlertTriangle, BookOpen } from 'lucide-react';
import './Support.css';

const Support: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return (
    <div className="support-page">
      <AppHeader title="Suporte e Ajuda" showBack onBack={() => navigate(-1)} />
      
      <main className="content p-4">
        <h1 className="page-title text-primary mb-2">Como podemos ajudar?</h1>
        <p className="page-subtitle mb-6">A central de atendimento e dúvidas da sua comunidade digital solidária.</p>

        <section className="faq-section mb-8">
          <h2 className="section-subtitle mb-4 flex items-center gap-2"><BookOpen size={20} className="text-secondary" /> Dúvidas Frequentes</h2>
          
          <div className="faq-item">
            <h4 className="faq-question">Como funciona o crédito iFood?</h4>
            <p className="faq-answer">Ao confirmar o valor, o Mealfy gera um gift card parceiro iFood e designa à família elegível (coração partido 💔 na região). O código aparece no painel do beneficiário — o doador não precisa repassar o voucher manualmente.</p>
          </div>
          
          <div className="faq-item">
            <h4 className="faq-question">Posso doar de forma anônima?</h4>
            <p className="faq-answer">Sim! Clicando em "Pular e doar anônimo" geramos uma tag efêmera no sistema e protegemos a transação, desvinculando-a totalmente do ranking oficial.</p>
          </div>

          <div className="faq-item">
            <h4 className="faq-question">O que significam os corações?</h4>
            <p className="faq-answer">Um coração partido (💔) demonstra famílias que precisam de apoio hoje. Um coração preenchido (❤️) sinaliza famílias que já receberam crédito iFood. Quando zerar os corações partidos, use o Apoio Regional.</p>
          </div>
        </section>

        <section className="contact-section">
          <h2 className="section-subtitle mb-4 flex items-center gap-2"><AlertTriangle size={20} className="text-error" /> Atendimento Direto</h2>
          
          <div className="flex-col gap-3">
            <Button 
              variant="outline" 
              fullWidth 
              size="large"
              icon={<MessageSquare size={20} className="text-success" />}
              onClick={() => showToast('Iniciando atendimento via WhatsApp...', 'info')}
            >
              Falar com Mealfy no WhatsApp
            </Button>
            
            <Button 
              variant="outline" 
              fullWidth 
              icon={<Mail size={20} />}
              onClick={() => showToast('Abrindo cliente de e-mail...', 'info')}
            >
              Enviar um E-mail ao Suporte
            </Button>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Support;
