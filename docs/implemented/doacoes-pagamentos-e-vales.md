# Doações, pagamentos e vales

## Estado: implementado parcialmente — não liberar fluxo financeiro atual

## Backend real

O backend contém uma implementação estruturada para o domínio:

- modelos `Donation`, `Payment`, `PaymentEvent`, `GiftCard`, `GiftCardOrder` e histórico de mensagens no Prisma (`backend/prisma/schema.prisma:410-571`);
- criação, consulta, cancelamento e histórico de doações em `backend/src/modules/donations/**`;
- pagamentos, webhook e expiração em `backend/src/modules/payments/**`;
- estoque/importação/invalidação de vales sob `backend/src/modules/giftCards/**`;
- códigos criptografados em repouso e hash anti-duplicidade (`backend/src/shared/crypto/crypto.service.ts` e schema);
- evento de pagamento com `externalEventId` único, para idempotência (`schema.prisma:482-494`);
- limite de taxa específico para webhook (`backend/src/app.ts:56-64`);
- endpoint de beneficiário para seus gift cards (`backend/src/modules/beneficiary/**`).

O contrato do frontend descreve `POST /donations` devolvendo doação e cobrança Pix, e `GET /payments/:id` para status (`src/api/donationsApi.ts:3-89`). Na família direta, `DonationChoice` chama esse endpoint e envia o resultado Pix à tela de sucesso (`src/pages/DonationChoice.tsx:92-111`).

## Providers disponíveis

O registry contém `MockPixProvider` e provider Stripe. O ambiente seleciona `PAYMENT_PROVIDER`, com padrão `mock` (`backend/src/config/env.ts:43-51`). `MockPixProvider` é explicitamente fictício; portanto não é provider de produção.

A abstração de provider de gift cards inclui inventário manual e provider stub; os nomes de fornecedores externos no enum não demonstram integração comercial concluída.

## Limitações críticas

- Se `createDonation()` sofre `ApiNetworkError`, o frontend cai no fluxo local a partir de `DonationChoice.tsx:126-183`, libera código mock, marca a família como atendida e navega para sucesso. O comentário o limita a desenvolvimento, porém não há guarda explícito nesse bloco. Isso é risco financeiro crítico.
- Apoio em lote e regional são declarados mock-only no client (`src/api/donationsApi.ts:94-99`) e o backend não possui essas rotas.
- Apoio ampliado (`src/pages/BigDonation.tsx`) é simulado; não representa pagamento, alocação ou recibo reais.
- O provider padrão de pagamento pode iniciar como mock em produção se a configuração não for endurecida.
- A documentação existente registra que o fluxo atual usa Pix mock e que um gateway externo deve ser escolhido/configurado.

A especificação de correção está em [integridade de doações, Pix e vales](../pending/integridade-doacoes-pix-e-vales.md).
