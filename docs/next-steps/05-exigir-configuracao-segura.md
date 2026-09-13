# Exigir configuração segura de produção

- **Prioridade:** crítica — bloqueia produção.
- **Objetivo:** falhar cedo diante de CORS aberto, provider mock ou segredos ausentes.
- **Contexto técnico:** `CORS_ORIGIN=*` e `PAYMENT_PROVIDER=mock` são defaults em `backend/src/config/env.ts`.
- **Escopo:** validação por ambiente, configuração de headers e documentação de env.
- **Áreas afetadas:** `backend/src/config/env.ts`, `app.ts`, `.env.example`, Docker/hosting e testes de configuração.
- **Passos:** definir regras para `NODE_ENV=production`; exigir allowlist HTTPS, provider live e segredos; configurar CSP/HSTS/referrer/permissions no host.
- **Dependências/pré-requisitos:** domínios e credenciais live definidos.
- **Critérios de aceite:** produção não inicia com wildcard CORS, mock Pix ou webhook/segredo faltante.
- **Riscos e validações:** CORS excessivamente restrito pode quebrar clientes Capacitor/web; validar todas as origens aprovadas.
