# Integridade de doações, Pix e vales

## Prioridade: crítica

## Objetivo

Garantir que pagamento, doação, benefício e comunicação de sucesso sejam autoritativos, auditáveis e jamais criados por fallback local em ambiente de produção.

## Estado observado

O backend possui modelos, rotas, criptografia, reserva de gift card e webhook idempotente. Contudo:

- `src/pages/DonationChoice.tsx:113-183` continua fluxo local após `ApiNetworkError`; ele libera código, chama `markFamilyFed` e navega para sucesso sem confirmação remota de pagamento.
- `src/api/donationsApi.ts:94-99` expõe doação em lote/regional declarada mock-only e sem rota backend.
- `src/pages/BigDonation.tsx:31-62` constrói resultado mock e código fixo.
- O padrão `PAYMENT_PROVIDER=mock` em `backend/src/config/env.ts:43-46` permite provider fictício se produção não o rejeitar.

## Escopo

- Abortamento seguro em erros de rede ou resposta inválida da API.
- Ocultação ou implementação transacional de apoio coletivo, lote, regional e ampliado.
- Provider Pix live configurado, webhook assinado e testes de expiração/idempotência.
- Validação de ambiente que proíba `mock` em produção.
- Reconciliação e operação de estoque manual de vales enquanto não houver fornecedor externo real.

## Fluxo esperado

1. Doador cria intenção no backend.
2. Backend devolve cobrança do provider live.
3. Cliente mostra instruções de pagamento, sem dizer que a família foi atendida.
4. Webhook autenticado e idempotente muda pagamento/doação e libera vale transacionalmente.
5. Cliente consulta estado autoritativo; somente então mostra benefício ou conclusão.
6. Falha de rede mostra estado desconhecido/retentativa, nunca vale ou sucesso local.

## Integrações e dependências

Provider Pix contratado/configurado; credenciais live e segredo de webhook; banco PostgreSQL; fluxo de estoque/importação de vales; observabilidade de webhook.

## Critérios de aceite

- Nenhum caminho de frontend libera código, marca família como atendida ou confirma doação sem resposta autoritativa.
- Produção falha no boot com provider mock, segredo ausente ou credencial live inválida.
- Eventos repetidos não liberam segundo vale.
- Lote/regional/ampliado são reais e auditáveis ou não são exibidos.
- Testes integram pagamento, duplicidade, expiração, falta de estoque e falha de rede.

## Riscos

É um domínio financeiro e de benefício social; alterações exigem testes de integração e revisão operacional antes de ativar produção.
