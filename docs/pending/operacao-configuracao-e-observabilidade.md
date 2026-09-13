# Operação, configuração e observabilidade

## Prioridade: alta

## Objetivo

Impedir configuração insegura em produção e fornecer sinais operacionais de falhas de API, pagamento, estoque e infraestrutura.

## Estado observado

- `CORS_ORIGIN` usa default `*` em `backend/src/config/env.ts:35`; `backend/.env.example` também o exemplifica.
- `PAYMENT_PROVIDER` default é `mock`.
- O backend usa `helmet`, rate limits, trust proxy e healthcheck, mas não há alerta integrado; `alert.service.ts:57` contém TODO de Sentry/Slack.
- O Docker frontend não configura explicitamente CSP, HSTS, `Referrer-Policy`, `Permissions-Policy` ou anti-framing.
- README do backend documenta migrations e `/health`, mas o README raiz é template.

## Escopo

- Validar no boot configurações de produção: origens HTTPS explicitamente autorizadas, segredos, provider live e banco configurado.
- Criar logs estruturados e correlação de requisições sem vazar segredo/PII.
- Integrar rastreamento de exceções e alertas para erro de webhook, falha de pagamento, estoque baixo, banco e disponibilidade.
- Definir métricas/health/readiness adequadas ao serviço.
- Configurar security headers no host/Nginx após validar origens necessárias.

## Critérios de aceite

- Produção não inicia com wildcard CORS ou provider mock.
- Evento de falha crítica gera sinal observável e acionável.
- Logs não contêm código de vale, senha, token, segredo ou PII desnecessária.
- Deploy aplica migrations versionadas e valida health/readiness.

## Dependências

Serviço de observabilidade e canal de alerta escolhidos, configuração de domínio/origens e credenciais de produção.
