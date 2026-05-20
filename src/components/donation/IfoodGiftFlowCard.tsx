import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { IFOOD_FLOW_STEPS } from '../../lib/ifoodGift';
import './IfoodGiftFlowCard.css';

const IfoodGiftFlowCard: React.FC = () => (
  <section className="ifood-flow-card" aria-label="Como funciona o gift iFood">
    <div className="ifood-flow-header">
      <div className="ifood-flow-badge">
        <UtensilsCrossed size={18} />
        <span>Parceiro iFood</span>
      </div>
      <p className="ifood-flow-lead">
        Sua contribuição vira <strong>crédito no iFood</strong> para a família escolher refeições — você não precisa do código; ele fica no app do beneficiário.
      </p>
    </div>
    <ol className="ifood-flow-steps">
      {IFOOD_FLOW_STEPS.map((item) => (
        <li key={item.step} className="ifood-flow-step">
          <span className="ifood-flow-step-num">{item.step}</span>
          <div>
            <strong>{item.title}</strong>
            <p>{item.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  </section>
);

export default IfoodGiftFlowCard;
