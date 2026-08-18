import React from 'react';
import './FaithCarousel.css';

/**
 * Faixa editorial discreta (ticker/marquee) exibida entre os stories e o hero
 * da Home. O texto corre continuamente da direita para a esquerda, em loop, sem
 * paginação, slides ou pausas. O conteúdo é duplicado para fechar o loop sem
 * buraco visível.
 */
const FAITH_MESSAGE =
  'Para que todos vejam, entendam e juntamente compreendam que a mão do Senhor foi quem fez isso †';

const FaithCarousel: React.FC = () => {
  return (
    <div className="faith-ticker" aria-label="Mensagem de fé">
      <div className="faith-ticker-track" aria-hidden="true">
        <span>{FAITH_MESSAGE}</span>
        <span>{FAITH_MESSAGE}</span>
      </div>
    </div>
  );
};

export default FaithCarousel;
