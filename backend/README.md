# Mealfy Backend (MVP)

Backend **real** do Mealfy — Express + TypeScript + Prisma + PostgreSQL, **independente** do
app mobile (React/Vite/Capacitor). Pensado para subir isoladamente no **Railway/Render**
apontando para esta pasta `/backend`.

> ⚠️ Não confundir com `src/backend/` **dentro do app mobile**: aquilo é a camada de
> serviços/mocks do front. O backend real é **somente esta pasta** (`/backend`).

---

## Stack
- Node.js 22 + Express 4
- TypeScript
- Prisma ORM + PostgreSQL
- Zod (validação de payloads / env)
- JWT + bcrypt/argon2 → **Fase 2**
- Pix **mockado** inicialmente; gift cards importados internamente

## Estrutura
```
backend/
  package.json  tsconfig.json  tsconfig.seed.json
  .env.example  .gitignore  Dockerfile  .dockerignore  README.md
  prisma/
    schema.prisma                 # 14 tabelas + 13 enums
    migrations/<ts>_init/          # migration inicial (versionada)
    seed.ts                        # dados de dev/staging (idempotente)
  src/
    config/env.ts                  # validação de env (Zod)
    database/prisma.ts             # Prisma Client singleton + getDatabaseStatus()
    shared/{errors,middlewares}/   # AppError, errorHandler, notFound
    modules/health/                # GET /health (pronto)
    app.ts  server.ts
```

---

## 1. Rodar localmente

Pré-requisito: um PostgreSQL acessível (local, Docker, Supabase, Railway ou Render).

```bash
cd backend
cp .env.example .env          # preencha DATABASE_URL (e o resto)
npm install
npm run prisma:generate       # gera o Prisma Client
npm run prisma:migrate        # cria/aplica as migrations no banco (dev)
npm run prisma:seed           # popula dados de teste (dev/staging)
npm run dev                   # API em http://localhost:3000
```

Sem um Postgres à mão? Você ainda consegue:
```bash
npm run typecheck             # tsc --noEmit (src)
npm run typecheck:seed        # tsc do seed
npm run build                 # prisma generate + tsc
npx prisma validate           # valida o schema
```
(Apenas `prisma:migrate`/`prisma:seed`/`prisma:studio` exigem um banco real.)

## 2. Variáveis de ambiente (`.env`)

| Variável | Obrigatória | Quando | Descrição |
|---|:---:|---|---|
| `NODE_ENV` | não | sempre | `development` \| `test` \| `production` |
| `PORT` | não | sempre | porta (default 3000; Railway/Render injetam) |
| `CORS_ORIGIN` | não | sempre | origens permitidas (`*` ou lista por vírgula) |
| `DATABASE_URL` | **sim** | a partir de migrate/seed/runtime DB | string do PostgreSQL |
| `JWT_SECRET` | sim* | Fase 2 (auth) | segredo do JWT |
| `ENCRYPTION_KEY` | sim* | Fase 3 (gift cards) | chave AES-256 dos códigos |
| `PAYMENT_PROVIDER` | não | Fase 5 | `mock` no MVP |
| `PAYMENT_WEBHOOK_SECRET` | sim* | Fase 5 | assinatura do webhook Pix |
| `PIX_EXPIRATION_MINUTES` | não | Fase 5 | expiração da cobrança (default 30) |
| `EMAIL_PROVIDER` / `EMAIL_API_KEY` | não | Fase 6 | e-mail (mock no MVP) |
| `APP_URL` / `ADMIN_URL` | não | deploy | URLs públicas (CORS) |

`*` = obrigatória quando a fase correspondente entrar.

## 3. Migrations

```bash
# Desenvolvimento (cria migration a partir do schema e aplica):
npm run prisma:migrate

# Produção/staging (aplica migrations já versionadas, sem gerar novas):
npm run prisma:deploy        # = prisma migrate deploy
```
A migration inicial (`prisma/migrations/<ts>_init`) já está versionada — em um banco novo,
`prisma:deploy` cria as 14 tabelas e 13 enums.

## 4. Seed (dev/staging)

```bash
npm run prisma:seed
```
Cria: admin, entidade aprovada, doador; famílias SP/RJ (2 aprovadas com dependente 0–17,
1 pendente, 1 bloqueada); lotes de gift card para `ifood`/`ninetynine`/`carrefour`.
É **idempotente** (upsert) — pode rodar de novo sem duplicar.
> ⚠️ Nunca rode o seed em produção (dados/códigos são fictícios).

## 5. Healthcheck

```bash
curl http://localhost:3000/health
# { "status": "ok", "service": "mealfy-backend", "database": "connected", ... }
```
`database` reflete a conexão: `connected` | `disconnected` | `not_configured`.

---

## 6. Deploy no Railway / Render

A API sobe **isoladamente** (não depende do Vite/Capacitor). Configure o serviço apontando
para a pasta `backend`:

| Config | Valor |
|---|---|
| **Root Directory** | `backend` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Pre-deploy / Release** | `npm run prisma:deploy` (aplica migrations) |
| **Health Check Path** | `/health` |

**Environment Variables** (mínimo):
```
DATABASE_URL=postgresql://...
JWT_SECRET=<defina>
CORS_ORIGIN=https://seu-app,https://seu-admin
ENCRYPTION_KEY=<defina>
PAYMENT_PROVIDER=mock
NODE_ENV=production
```

Passos:
1. Provisione um **PostgreSQL** (Supabase/Railway/Render) e copie a `DATABASE_URL`.
2. Crie o serviço Web apontando Root Directory = `backend`.
3. Defina as variáveis acima.
4. No primeiro deploy, rode as migrations: `npm run prisma:deploy`
   (ou deixe o **Dockerfile** fazer — o `CMD` roda `migrate deploy` antes de subir).
5. (Opcional, só staging) rode `npm run prisma:seed`.
6. Confirme `GET /health` retornando `database: "connected"`.

### Docker (opcional)
Há um `Dockerfile` pronto (node:22-slim + openssl). Build/start:
```bash
docker build -t mealfy-backend ./backend
docker run -p 3000:3000 --env-file backend/.env mealfy-backend
```

### App mobile apontando para a API
No app (`Mealfy-repo/.env`): `VITE_API_URL=https://sua-api...` e rebuild do APK.

---

## API — rotas (Fase 2)

Todas as rotas (exceto `/auth/*` e `/health`) exigem `Authorization: Bearer <token>`.

**Usuários seedados** (senha `123456`): `admin@mealfy.com` (admin) · `entidade@mealfy.com` (entity) · `doador@mealfy.com` (donor).

**Obter token:**
```bash
TOKEN=$(curl -s -X POST localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@mealfy.com","password":"123456"}' | jq -r .token)
curl localhost:3000/me -H "Authorization: Bearer $TOKEN"
```

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/register` | público | `{name,email,password,role}` — role `donor`\|`entity` (admin/beneficiary recusados) |
| POST | `/auth/login` | público | `{email,password}` → `{token,user}` |
| GET | `/me` | autenticado | usuário atual (sem hash) |
| PATCH | `/me` | autenticado | atualiza name/avatarUrl/instagram/phone |
| GET | `/entity/dashboard` | entity | resumo das famílias da entidade |
| GET | `/entity/families` | entity | famílias da própria entidade |
| POST | `/entity/families` | entity | cria família (`>=1` dependente) |
| PATCH | `/entity/families/:id` | entity | edita família da própria entidade |
| GET | `/families` | autenticado | role-aware (admin/entity=gestão; demais=aprovadas) |
| GET | `/families/map` | autenticado | só aprovadas + localização; **sem PII** |
| GET | `/families/:id` | autenticado | serialização por papel |
| POST | `/families` | entity·admin | cria família |
| PATCH | `/families/:id` | entity·admin | edita (entity só a sua) |
| POST | `/families/:id/approve` | admin | aprova (exige dependente 0–17) |
| POST | `/families/:id/reject` | admin | reprova |
| POST | `/families/:id/block` | admin | bloqueia |
| POST | `/families/:id/request-daily-support` | entity·admin | `{provider}` do dia |
| GET | `/admin/audit-logs` | admin | ações críticas |
| POST | `/admin/entities/:id/approve` | admin | aprova entidade |
| POST | `/admin/entities/:id/block` | admin | bloqueia entidade |

**Exemplo — entidade cria família e admin aprova:**
```bash
ET=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"email":"entidade@mealfy.com","password":"123456"}' | jq -r .token)
AD=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@mealfy.com","password":"123456"}' | jq -r .token)
FID=$(curl -s -X POST localhost:3000/entity/families -H "Authorization: Bearer $ET" -H 'Content-Type: application/json' \
  -d '{"responsibleName":"Joao","displayName":"Familia X","city":"Sao Paulo","state":"SP","latitude":-23.5,"longitude":-46.6,"dependents":[{"name":"Kid","age":10}]}' | jq -r .family.id)
curl -s -X POST localhost:3000/families/$FID/approve -H "Authorization: Bearer $AD" | jq .family.approvalStatus
curl -s localhost:3000/families/map -H "Authorization: Bearer $AD" | jq '.families[].id'
```

> **Regras garantidas no backend:** senha com bcrypt (nunca em claro) · `/me` sem hash ·
> aprovação exige dependente 0–17 · doador nunca recebe CPF/NIS/endereço · entidade só
> gerencia as suas famílias · approve/reject/block auditados.

## Gift cards (Fase 3)

Domínio de gift cards: importação manual pelo admin, estoque, criptografia e reserva.
Todas as rotas são **admin** (montadas em `/admin`).

| Método | Rota | Descrição |
|---|---|---|
| POST | `/admin/gift-cards/import` | importa um lote de códigos |
| GET | `/admin/gift-cards/stock` | estoque por provider (available/reserved/used/expired/invalid/total) |
| GET | `/admin/gift-cards` | lista (filtros `provider`/`status`/`batchId`, `page`/`limit`) |
| GET | `/admin/gift-card-batches` | lotes importados |
| POST | `/admin/gift-cards/:id/invalidate` | invalida um código (available/reserved) |

**Payload do import:**
```json
{
  "provider": "ifood | ninetynine | carrefour",
  "batchName": "Lote Maio/2026",
  "amount": 2500,
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "codes": ["IFOOD-AAAA-0001", "IFOOD-BBBB-0002"]
}
```
Limpa espaços, ignora linhas vazias, deduplica (no payload e contra o banco via `codeHash`).
Resposta é só **resumo** (`batchId`, `totalReceived/Imported/Duplicated/Invalid`, `warnings`) — **nunca** o código.

**Exemplos (curl):**
```bash
AD=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@mealfy.com","password":"123456"}' | jq -r .token)
# importar
curl -s -X POST localhost:3000/admin/gift-cards/import -H "Authorization: Bearer $AD" -H 'Content-Type: application/json' \
  -d '{"provider":"ifood","batchName":"Maio","amount":2500,"codes":["IFOOD-AAAA-0001","IFOOD-BBBB-0002"]}' | jq
# estoque / listagem / invalidar
curl -s localhost:3000/admin/gift-cards/stock -H "Authorization: Bearer $AD" | jq
curl -s "localhost:3000/admin/gift-cards?provider=ifood&status=available&limit=20" -H "Authorization: Bearer $AD" | jq
curl -s -X POST localhost:3000/admin/gift-cards/<ID>/invalidate -H "Authorization: Bearer $AD" -H 'Content-Type: application/json' -d '{"reason":"lote vencido"}' | jq
```

**Criptografia** (`src/shared/crypto/crypto.service.ts`):
- `codeEncrypted`: **AES-256-GCM** com `ENCRYPTION_KEY` (formato `iv.tag.cipher` em base64);
- `codeHash`: **SHA-256** (determinístico, para anti-duplicidade);
- `codeMasked`: só o final (`****-1234`).

**Campos que NUNCA aparecem em resposta:** `codeEncrypted`, `codeHash` e o **código em claro**.
O código puro só é decifrado no DTO do **beneficiário** (`toBeneficiaryGiftCard`), preparado para a Fase 4 e **ainda sem endpoint**.

**Reserva/liberação (service interno, sem endpoint ainda):**
`reserveAvailableCard` (available→reserved), `releaseReservedCard` (reserved→used) e
`releaseAvailableCardForDonation` (available→used) usam `UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED)`
para impedir que dois processos peguem o mesmo código. Código `used` nunca volta a `available`; sem estoque → `409 no_stock`.

> ⚠️ Os gift cards do **seed** usam `codeEncrypted` placeholder (base64 — Fase 1). Os reais, via
> `import`, são **AES-256-GCM**. Em produção, importe via o endpoint (nunca dependa do seed).

## Doações (Fase 4)

Fluxo: doador cria intenção → (Pix na Fase 5; **mock** nesta fase) → confirmação libera
**1 gift card** e marca a família **alimentada** (1x/dia). O **doador nunca vê o código**;
só o **beneficiário** vê.

**Máquina de estados:** `pending_payment → (payment_confirmed) → completed` · `canceled` · `failed` · `refunded`.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/donations` | donor | cria intenção (`pending_payment`) `{familyId, amount, provider?}` |
| GET | `/donations/:id` | autenticado | role-aware (doador a sua; admin/entidade dona) |
| POST | `/donations/:id/confirm-payment-mock` | admin (dev/staging) | confirma pagamento mock → libera vale → `completed` |
| POST | `/donations/:id/cancel` | donor dono · admin | cancela `pending_payment` |
| GET | `/me/donations` | donor | histórico (sem código) |
| GET | `/families/:id/donations` | admin · entidade dona | doações da família |
| GET | `/beneficiary/gift-cards` · `/:id` | beneficiary | **vê o código decifrado** |

**Regras (autoritativas no backend):**
- família **aprovada** + **dependente 0–17** + **não alimentada no ciclo** (reset **08h America/Sao_Paulo**);
- provider: `todayRequestedProvider` → `preferredGiftCardProvider` → `provider` do payload;
- **estoque** conferido antes de criar; vale **só liberado após confirmação** (nunca antes);
- na confirmação, transação atômica: guarda diária (`UPDATE ... WHERE lastFedAt < cycleStart`) →
  libera vale (`available→used`, `FOR UPDATE SKIP LOCKED`) → `completed` → "alimentada por".

**Quem vê o quê:** doador → "Família recebeu o apoio" + "Vale iFood enviado" + "Alimentada por você" (**sem código**);
beneficiário → **código completo** (decifrado, só no endpoint dele); admin/entidade → gestão **sem código**.

**Exemplo (curl):**
```bash
DN=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"email":"doador@mealfy.com","password":"123456"}' | jq -r .token)
AD=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@mealfy.com","password":"123456"}' | jq -r .token)
ID=$(curl -s -X POST localhost:3000/donations -H "Authorization: Bearer $DN" -H 'Content-Type: application/json' -d '{"familyId":"seed-fam-approved-sp","amount":2500}' | jq -r .donation.id)
curl -s -X POST localhost:3000/donations/$ID/confirm-payment-mock -H "Authorization: Bearer $AD" | jq .donation.status   # completed
curl -s localhost:3000/me/donations -H "Authorization: Bearer $DN" | jq               # doador: sem código
BN=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"email":"beneficiario@mealfy.com","password":"123456"}' | jq -r .token)
curl -s localhost:3000/beneficiary/gift-cards -H "Authorization: Bearer $BN" | jq      # beneficiário: código decifrado
```

> ⚠️ `confirm-payment-mock` é **dev/staging** (bloqueado em produção). O Pix real + webhook chegam na **Fase 5**.

## Pagamentos Pix (Fase 5)

Camada de pagamento abstrata (`PaymentProvider`) com **MockPix** (dev/staging). Ao criar
a doação, gera-se a **cobrança Pix**; o vale só é liberado quando o **pagamento é confirmado
pelo webhook** (ou pela simulação dev). Webhook **idempotente** e assinado.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/donations` | donor | cria doação **+ cobrança Pix** (retorna `pixQrCode`/`pixCopyPaste`/`expiresAt`) |
| GET | `/payments/:id` | doador dono · admin | status da cobrança |
| POST | `/payments/webhook` | **público** (assinatura) | confirma pagamento (idempotente) → libera vale |
| POST | `/payments/:id/simulate-paid` | admin (dev/staging) | gera um webhook `paid` assinado |
| POST | `/payments/expire-overdue` | admin | expira cobranças vencidas (cron em produção) |

**Segurança / regras:**
- webhook autenticado por **HMAC-SHA256** (`PAYMENT_WEBHOOK_SECRET`, header `x-webhook-signature`); assinatura inválida → **401**;
- **idempotência**: `PaymentEvent.externalEventId` é único — evento repetido → `duplicate_ignored` (sem dupla liberação);
- vale **só liberado após `paid`** (a finalização é a mesma transação atômica da Fase 4: guarda diária → libera vale → completa);
- cobrança **expirada** não pode ser paga (`ignored_not_payable`); doação vira `failed`;
- nenhuma resposta expõe o código do gift card.

**Trocar para um gateway real:** implementar `RealPixProvider implements PaymentProvider`
(`src/modules/payments/providers/`) e selecionar via `PAYMENT_PROVIDER`. Nada mais muda.

**Exemplo (curl):**
```bash
DN=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"email":"doador@mealfy.com","password":"123456"}' | jq -r .token)
AD=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@mealfy.com","password":"123456"}' | jq -r .token)
RESP=$(curl -s -X POST localhost:3000/donations -H "Authorization: Bearer $DN" -H 'Content-Type: application/json' -d '{"familyId":"seed-fam-approved-sp","amount":2500}')
echo "$RESP" | jq '{donation:.donation.status, pix:.payment.pixCopyPaste}'
PID=$(echo "$RESP" | jq -r .payment.id)
curl -s -X POST localhost:3000/payments/$PID/simulate-paid -H "Authorization: Bearer $AD" | jq   # processed_paid
```

## Status das fases
- **Fase 1A** ✅ Fundação da API (Express + TS + `/health` + env Zod).
- **Fase 1B** ✅ Prisma + PostgreSQL (client singleton + status no health).
- **Fase 1C** ✅ Schema inicial (14 tabelas, 13 enums) + migration inicial.
- **Fase 1D** ✅ Seed dev/staging idempotente.
- **Fase 1E** ✅ Preparação de deploy Railway/Render (build/start/Dockerfile).
- **Fase 1F** ✅ Esta documentação.
- **Fase 1G** ✅ Validação em **PostgreSQL real** (ver abaixo).
- **Fase 2** ✅ Auth (bcrypt+JWT) · /me · entidades · famílias + dependentes ·
  regra 0–17 · aprovação manual · mapa/ficha · provider diário · audit logs.
- **Fase 5** ✅ Pagamentos Pix: `PaymentProvider` abstrato + **MockPix**, cobrança na doação,
  **webhook idempotente assinado**, simulate-paid (dev), expiração. Vale só após `paid`.
- **Fase 4** ✅ Doações: máquina de estados, **bloqueio diário** (reset 08h SP), confirmação
  mock → liberação de vale, "alimentada por", histórico do doador (sem código) e
  **endpoint do beneficiário** (vê o código). Validado ao vivo no Supabase.
- **Fase 3** ✅ Gift cards reais: crypto AES-256-GCM, importação admin, estoque/listagem
  segura (só `codeMasked`), invalidação e reserva/liberação transacional (`FOR UPDATE SKIP LOCKED`).
- **Fase 2H** ✅ Validado **ao vivo no Supabase cloud** (projeto `mealfy-staging`, PostgreSQL 17, us-west-2):
  - schema (14 tabelas/13 enums) + seed idempotente (users 3 · entities 1 · families 4 · dependents 5 · gift_card_batches 3 · gift_cards 15);
  - **API local conectada ao Supabase**: `GET /health` → `database: "connected"`;
  - **smoke tests HTTP** passaram (login, `/me` sem hash, criar família, aprovar 0–17, recusar sem menor = 422, `/families/map` sem PII, provider diário);
  - **audit logs gravados no cloud** (`create/approve/reject/request_daily_provider`);
  - RLS habilitado nas tabelas (a API pública do Supabase não acessa — só o backend, como owner).

> **Conexão Prisma ↔ Supabase:** runtime usa o **transaction pooler** (porta 6543, `?pgbouncer=true`).
> **Baseline já aplicado:** a migration `20260625000605_init` está registrada como aplicada no
> Supabase (`_prisma_migrations`), então `prisma migrate deploy` **não reaplica** o schema.
> Para **migrations futuras** (que o pgbouncer não suporta): adicione no `.env` o
> `DIRECT_URL` (session pooler, porta 5432) e `directUrl = env("DIRECT_URL")` ao datasource,
> e então rode `npm run prisma:deploy`.
>
> **Gift cards (Fase 3):** exige `ENCRYPTION_KEY` (32 bytes em hex = 64 chars) no `.env` —
> usada no AES-256-GCM dos códigos. Nunca commitar.

### Validação em PostgreSQL real (Fase 1G)
Fluxo provado de ponta a ponta contra um Postgres 17 real:
`prisma migrate deploy` (migration `*_init` aplicada) → `prisma:seed` → `npm run build`/`typecheck`
verdes → API local com `GET /health` retornando **`database: "connected"`**.

Dados conferidos no banco (e **idempotentes** — re-seed não duplica):

| Tabela | Qtde | Detalhe |
|---|---:|---|
| users | 3 | admin, entity, donor |
| entities | 1 | aprovada |
| families | 4 | 2 approved · 1 pending · 1 blocked |
| family_dependents | 5 | aprovada SP tem menores elegíveis (8 e 14 anos) |
| gift_card_batches | 3 | ifood · ninetynine · carrefour |
| gift_cards | 15 | 5 por provider, todos `available` |

> Sem Postgres à mão? Dá para reproduzir com um Postgres local/cloud em `DATABASE_URL`,
> ou com um Postgres embarcado de dev (ex.: pacote `embedded-postgres`).

### Próximos passos — Fase 6 (Front/Admin + extras)
- Conectar app mobile e painel admin à API real (substituir mocks/localStorage com fallback controlado).
- **Gateway Pix real** (`RealPixProvider`) quando escolhido; e-mail real (credenciais/notificações).
- Favoritos, ranking/badges derivados de doações, recorrência (lembrete).

Plano completo: [`../docs/BACKEND_AUDIT_AND_IMPLEMENTATION_PLAN.md`](../docs/BACKEND_AUDIT_AND_IMPLEMENTATION_PLAN.md).

> Os arquivos `ARCHITECTURE.md`, `API_ROUTES.md`, `MOCK_DATA.md`, `AUDITORIA_TECNICA.md`,
> `AUDIT_NOTES.md`, `CRUD_E_ARQUITETURA_DO_BANCO.md` descrevem o **antigo scaffold mockado**
> (file-JSON) e estão **obsoletos** — serão removidos/arquivados na Fase 2.
