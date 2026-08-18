import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { MessageSquare, Mail, AlertTriangle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import './Support.css';

interface FaqItem {
  question: string;
  answer: string;
}

const Support: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs: FaqItem[] = [
    {
      question: "Como funciona o apoio alimentar da rede?",
      answer: "Seu apoio é convertido em um vale-refeição digital (iFood Alimentação). O sistema busca de forma inteligente uma família sinalizada como necessitada na região de foco e disponibiliza as credenciais e o código de resgate direto no painel do beneficiário."
    },
    {
      question: "Posso apoiar de forma anônima?",
      answer: "Sim! Basta acessar as configurações do seu Perfil e habilitar o 'Modo Anônimo'. Seu nome real e avatar serão ocultados de todos os rankings de impacto e visualizações públicas."
    },
    {
      question: "Como as famílias são cadastradas e verificadas?",
      answer: "As famílias são indicadas por apoiadores e verificadas pelas Entidades Parceiras locais. Caso possuam NIS ativo no Bolsa Família (Cadastro Único), a validação e liberação no sistema são instantâneas. Caso contrário, a entidade realiza uma vistoria social física."
    },
    {
      question: "O que significam as cores e luzes no mapa?",
      answer: "Pinos vermelhos com brilho pulsante indicam urgência crítica (famílias sem alimentação recente). Pinos verdes indicam famílias que já receberam apoio. Você pode filtrar e escolher as mais críticas."
    }
  ];

  const toggleFaq = (index: number) => {
    setActiveFaq(prev => prev === index ? null : index);
  };

  return (
    <div className="support-page">
      <AppHeader title="Suporte e Ajuda" showBack onBack={() => navigate(-1)} />
      
      <main className="content p-4">
        <h1 className="page-title text-primary mb-2">Como podemos ajudar?</h1>
        <p className="page-subtitle mb-6">A central de atendimento e dúvidas da sua comunidade de impacto contra a fome.</p>

        <section className="faq-section mb-6">
          <h2 className="section-subtitle mb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-secondary" /> Dúvidas Frequentes
          </h2>
          
          <div className="faq-accordion flex flex-col gap-2">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="faq-item-wrapper bg-white border border-outline-variant/50 rounded">
                  <button 
                    type="button" 
                    className="faq-trigger flex justify-between items-center w-full p-4 text-left font-bold text-primary text-sm transition-all"
                    onClick={() => toggleFaq(idx)}
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp size={16} className="text-secondary" /> : <ChevronDown size={16} className="text-outline" />}
                  </button>
                  
                  {isOpen && (
                    <div className="faq-body p-4 pt-0 text-xs text-outline leading-relaxed border-t border-outline-variant/20 bg-background/30">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="contact-section">
          <h2 className="section-subtitle mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-error" /> Atendimento Direto
          </h2>
          
          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              fullWidth 
              size="large"
              icon={<MessageSquare size={20} className="text-success" />}
              onClick={() => showToast('Iniciando atendimento via WhatsApp...', 'info')}
            >
              Falar com Suporte no WhatsApp
            </Button>
            
            <Button 
              variant="outline" 
              fullWidth 
              size="large"
              icon={<Mail size={20} />}
              onClick={() => showToast('Abrindo e-mail para suporte@melf.app...', 'info')}
            >
              Enviar E-mail para o Suporte
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Support;
