import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Check, Share2, History, HeartHandshake, UtensilsCrossed } from 'lucide-react';
import type { Donation, GiftCard, Family } from '../backend/types';
import { getGiftStatusLabel, isIfoodGift } from '../lib/ifoodGift';
import './Success.css';

const Success: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedMessage, setSelectedMessage] = useState<number | null>(null);

  const donationResult = location.state?.donationResult as {
    donation: Donation,
    giftCard: GiftCard,
    familyAssigned: Family
  } | undefined;

  const bigDonationResult = location.state?.bigDonationResult as any;
  const isBatch = location.state?.isBatch as boolean | undefined;
  const batchCount = location.state?.count as number | undefined;

  if (!donationResult && !bigDonationResult) {
    navigate('/');
    return null;
  }

  const messages = [
    "Você não está sozinho.",
    "Com carinho, este crédito iFood foi enviado para você e os pequenos.",
    "Estou torcendo por você e sua família."
  ];

  const giftStatus = donationResult
    ? getGiftStatusLabel(donationResult.giftCard.status)
    : '';

  return (
    <div className="success-page">
      <div className="success-hero flex-col items-center justify-center text-center p-4">
        <div className="success-icon-container mb-4">
          <div className="success-icon-bg">
            <Check size={48} color="white" />
          </div>
        </div>
        <h1 className="success-title text-primary mb-2">Crédito enviado!</h1>
        
        {bigDonationResult ? (
          <>
            <p className="success-subtitle text-outline mb-6">
              Sua contribuição regional gerou <strong>{bigDonationResult.giftCards.length} gifts iFood</strong> para{' '}
              <strong>{bigDonationResult.impactedFamiliesCount} famílias</strong> ({bigDonationResult.supportTierDesc}).
            </p>
            <div className="receipt-card mb-6">
              <div className="receipt-row">
                <span className="receipt-label">Valor total</span>
                <span className="receipt-value text-secondary">R$ {bigDonationResult.totalDistributedAmount},00</span>
              </div>
              <div className="receipt-divider"></div>
              <div className="receipt-row">
                <span className="receipt-label">Famílias</span>
                <span className="receipt-value">{bigDonationResult.impactedFamiliesCount}</span>
              </div>
              <div className="receipt-divider"></div>
              <div className="receipt-row">
                <span className="receipt-label">Gifts iFood</span>
                <span className="receipt-value">{bigDonationResult.giftCards.length} créditos</span>
              </div>
              <div className="receipt-divider"></div>
              <div className="receipt-row">
                <span className="receipt-label">Parceiro</span>
                <span className="receipt-value ifood-inline-badge">iFood</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="success-subtitle text-outline mb-4">
              {isBatch && batchCount && batchCount > 1 ? (
                <>
                  Geramos <strong>{batchCount} créditos iFood</strong> (R$ {donationResult!.donation.amount} cada, em média) para as famílias selecionadas.
                </>
              ) : (
                <>
                  O <strong>{donationResult!.giftCard.label}</strong> foi designado para{' '}
                  <strong>{donationResult!.familyAssigned.representativeName}</strong>
                  {donationResult!.familyAssigned.childrenCount != null && (
                    <> ({donationResult!.familyAssigned.childrenCount} {donationResult!.familyAssigned.childrenCount === 1 ? 'criança' : 'crianças'})</>
                  )}.
                </>
              )}
            </p>

            <div className="ifood-delivery-banner mb-4">
              <UtensilsCrossed size={20} />
              <div className="ifood-delivery-text">
                <strong>Próximo passo: família resgata no iFood</strong>
                <p>O código fica no painel do beneficiário. Você não precisa compartilhar o voucher.</p>
              </div>
            </div>

            <div className="receipt-card mb-6">
              <div className="receipt-row">
                <span className="receipt-label">Valor</span>
                <span className="receipt-value text-secondary">R$ {donationResult!.donation.amount},00</span>
              </div>
              <div className="receipt-divider"></div>
              <div className="receipt-row">
                <span className="receipt-label">Destino</span>
                <span className="receipt-value">
                  {donationResult!.familyAssigned.neighborhood || donationResult!.familyAssigned.representativeName || 'Família elegível'}
                </span>
              </div>
              <div className="receipt-divider"></div>
              <div className="receipt-row">
                <span className="receipt-label">Entrega</span>
                <span className="receipt-value ifood-inline-badge">Gift iFood</span>
              </div>
              <div className="receipt-divider"></div>
              <div className="receipt-row">
                <span className="receipt-label">Status</span>
                <span className="receipt-value text-success font-bold">{giftStatus}</span>
              </div>
              {isIfoodGift(donationResult!.giftCard) && (
                <>
                  <div className="receipt-divider"></div>
                  <div className="receipt-row receipt-row-muted">
                    <span className="receipt-label">Referência interna</span>
                    <span className="receipt-value font-mono text-outline" style={{ fontSize: '0.75rem' }}>
                      {donationResult!.giftCard.code}
                    </span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="message-section p-4">
        <h3 className="section-title mb-3 text-primary">Mensagem para a família</h3>
        <p className="section-desc mb-4">Opcional — acompanha o pedido no iFood quando a família resgatar o crédito.</p>
        
        <div className="message-options flex-col gap-3 mb-6">
          {messages.map((msg, index) => (
            <div 
              key={index}
              className={`message-card ${selectedMessage === index ? 'selected' : ''}`}
              onClick={() => setSelectedMessage(index)}
            >
              <HeartHandshake size={20} className={selectedMessage === index ? 'text-primary' : 'text-outline'} />
              <span className="message-text">{msg}</span>
            </div>
          ))}
        </div>

        <div className="action-buttons flex-col gap-3">
          <Button 
            className="shadow-glow" 
            size="large" 
            fullWidth
            onClick={() => navigate('/explore')}
          >
            Acompanhar impacto da região
          </Button>
          
          <div className="secondary-actions flex gap-3 mt-2">
            <Button 
              variant="outline" 
              fullWidth 
              icon={<Share2 size={18} />}
            >
              Compartilhar
            </Button>
            <Button 
              variant="outline" 
              fullWidth 
              icon={<History size={18} />}
              onClick={() => navigate('/profile')}
            >
              Meu Perfil
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;
