import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import { ShieldCheck } from 'lucide-react';
import './Support.css';

/**
 * Política de Privacidade — exigência da Play Store e da LGPD (Lei 13.709/2018).
 *
 * ATENÇÃO: este texto é um modelo técnico inicial baseado nos dados que o app
 * realmente coleta hoje. A versão final deve ser revisada e aprovada pelo
 * jurídico do cliente antes da publicação. Quando o texto final chegar, basta
 * substituir o conteúdo das seções abaixo (a estrutura e a rota /privacy já
 * estão prontas e linkadas no app).
 */

const LAST_UPDATED = '22 de julho de 2026';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Quem somos',
    body: 'O Mealfy é uma plataforma que conecta apoiadores, entidades sociais e famílias beneficiárias para o combate à insegurança alimentar infantil. O controlador dos dados pessoais tratados neste aplicativo é a organização responsável pelo Mealfy, cujos dados de contato constam ao final desta política.',
  },
  {
    title: '2. Dados que coletamos',
    body: 'Coletamos apenas o necessário para o funcionamento do serviço: (a) dados de cadastro — nome, e-mail e senha (armazenada de forma criptografada); (b) dados opcionais de perfil — foto, usuário de Instagram e mensagem pessoal; (c) dados de uso — histórico de apoios/doações, região de foco e posição no ranking público (quando você opta por aparecer); (d) dados de famílias cadastradas por entidades parceiras, tratados de forma pseudonimizada; (e) identificadores de login social (Google, Apple, Meta ou Gov.br), quando você escolhe essa forma de acesso.',
  },
  {
    title: '3. Como usamos os dados',
    body: 'Usamos seus dados para: autenticar seu acesso; processar e registrar apoios/doações; exibir ranking e ficha pública de impacto (somente se você ativar essas opções nas configurações de privacidade); operar a distribuição de vale-refeições; e cumprir obrigações legais e regulatórias. Não vendemos dados pessoais e não os usamos para publicidade de terceiros.',
  },
  {
    title: '4. Base legal (LGPD)',
    body: 'O tratamento se fundamenta em: execução de contrato (prestação do serviço), consentimento (perfil público, Instagram e ranking) e legítimo interesse (segurança da plataforma e prevenção a fraudes), nos termos do art. 7º da Lei nº 13.709/2018.',
  },
  {
    title: '5. Pagamentos',
    body: 'Os apoios são pagos via Pix. O comprovante e a confirmação do pagamento são verificados pela nossa equipe. Não armazenamos dados bancários completos nem chaves Pix dos apoiadores; registramos apenas identificadores da transação necessários à conciliação.',
  },
  {
    title: '6. Compartilhamento',
    body: 'Os dados são hospedados em nuvem (Supabase/AWS) e podem ser acessados por operadores estritamente necessários à operação do serviço. Compartilhamos dados apenas quando exigido por lei ou ordem judicial.',
  },
  {
    title: '7. Seus direitos',
    body: 'Você pode, a qualquer momento: acessar e corrigir seus dados no perfil; controlar sua visibilidade pública (ranking, Instagram e modo anônimo) nas configurações; e excluir definitivamente sua conta pelo próprio aplicativo (Perfil → Configurações → Excluir minha conta). A exclusão remove seus dados pessoais, mantendo apenas registros anonimizados exigidos por obrigação legal.',
  },
  {
    title: '8. Retenção e segurança',
    body: 'Mantemos os dados enquanto sua conta estiver ativa. Aplicamos criptografia em trânsito (HTTPS), controle de acesso por perfil e limitação de tentativas de autenticação. Registros financeiros podem ser retidos pelo prazo legal aplicável.',
  },
  {
    title: '9. Crianças e adolescentes',
    body: 'O Mealfy não é destinado ao cadastro direto de menores. Dados de crianças beneficiadas são inseridos por entidades sociais parceiras, de forma pseudonimizada, e nunca são exibidos publicamente com identificação.',
  },
  {
    title: '10. Alterações desta política',
    body: 'Podemos atualizar esta política para refletir mudanças no serviço ou na legislação. Avisaremos sobre alterações relevantes dentro do aplicativo.',
  },
  {
    title: '11. Contato do encarregado (DPO)',
    body: 'Para exercer seus direitos ou tirar dúvidas sobre privacidade, escreva para: privacidade@mealfy.app. [E-mail a confirmar pelo jurídico do cliente]',
  },
];

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="support-page">
      <AppHeader title="Privacidade" showBack onBack={() => navigate(-1)} />

      <main className="content p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={22} className="text-primary" />
          <h1 className="page-title text-primary">Política de Privacidade</h1>
        </div>
        <p className="page-subtitle mb-6">
          Última atualização: {LAST_UPDATED}. Levamos seus dados a sério — e você controla tudo pelo app.
        </p>

        <div className="flex flex-col gap-3">
          {SECTIONS.map((s) => (
            <div key={s.title} className="faq-item p-4 bg-white border border-outline-variant/30 rounded">
              <h4 className="faq-question font-bold text-primary text-sm mb-1">{s.title}</h4>
              <p className="faq-answer text-xs text-outline leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
