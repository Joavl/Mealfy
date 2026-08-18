# Mealfy — Roadmap para Play Store (decisões de 21/07/2026)

> Meta: app pronto para publicar na **Google Play Store**, com **backend + banco no Supabase**
> e **nada mockado** em produção. Questões jurídicas (LGPD, fiscal, termos) ficam com o cliente.
> Relacionados: [`PRODUCAO-READINESS.md`](./PRODUCAO-READINESS.md), [`MOCKS-PRODUCAO.md`](./MOCKS-PRODUCAO.md),
> [`SOCIAL_LOGIN.md`](./SOCIAL_LOGIN.md).

---

## 1. Decisões tomadas

| # | Decisão | Consequência técnica |
|---|---|---|
| 1 | Backend e banco de dados ficam no **Supabase** | API Express/Prisma hospedada apontando para Postgres Supabase de **produção** (projeto separado do staging `mealfy-staging`). Hospedagem da API: Railway/Render (Supabase não hospeda a API Express em si — ver §2). |
| 2 | **Tudo que é mock roda na nuvem** | Concluir Fase 6: doações, Pix, beneficiário, admin e ranking passam a bater na API real; remover/desligar o fallback localStorage em produção. |
| 3 | Login social: **Google, Apple, Facebook/Meta e Gov.br** | Backend já implementado (`/auth/oauth/*`, `/auth/govbr/*` + migration `oauth_accounts`). Falta: credenciais externas + plugin nativo no app. Apple é **obrigatória** se publicarmos no iOS com outros logins sociais. |
| 4 | Pagamento **Pix manual agora**, com espaço para automatizar depois | NÃO usar Google Play Billing (ver §3). Pix via gateway externo; fulfillment de gift card **manual** no início (abstração já existe) e automação depois. |
| 5 | Jurídico (LGPD/fiscal/termos) com o **cliente** | Fora do escopo técnico, mas o app precisa expor **política de privacidade** e **exclusão de conta** — exigências da Play Store (ver §5). |

## 2. Arquitetura de produção (Supabase)

```
App (Capacitor/Android) ──HTTPS──▶ API Express (Railway/Render) ──▶ Postgres Supabase (PROD)
                                        │
                                        ├─ Webhook Pix (gateway externo)
                                        └─ OAuth Google/Apple/Facebook/Gov.br
```

- **Banco**: novo projeto Supabase de produção (hoje só existe `mealfy-staging`).
- **API**: Supabase não roda a API Express como serviço contínuo de forma natural; opções:
  - (a) manter Express no **Railway/Render** apontando para o Supabase (caminho já documentado no `backend/README.md`), ou
  - (b) migrar módulos para **Supabase Edge Functions** (reescrever — não recomendado agora).
  Recomendação: **(a)** — banco Supabase + API Railway/Render.
- **Migrations em produção**: adicionar `DIRECT_URL` (session pooler, porta 5432) + `directUrl` no datasource, e rodar `prisma migrate deploy` por ela (o transaction pooler/pgbouncer não suporta DDL).

## 3. ⚠️ Pix NÃO é pelo Google Play — correção importante

**Google Play Billing não processa Pix para terceiros** e só pode ser usado para **bens digitais**.
Gift card/vale-alimentação é **bem do mundo real** → Play Billing é **proibido** para isso.

E o caso do Mealfy é melhor ainda: a política de pagamentos do Google Play **isenta doações a
organizações beneficentes** — apps de doação **podem (e devem) usar método de pagamento externo**.
Ou seja:

- ✅ Pix via **gateway externo** (Mercado Pago, Asaas, Efí, Pagar.me…) é o caminho correto e permitido na Play Store.
- ❌ "Gateway Pix do Google Play" não existe; Google Play Billing não se aplica ao Mealfy.

### Fulfillment manual agora, automação depois (já preparado)
- Backend já tem abstração de **gift card provider** com `manual_inventory` implementado
  (admin importa códigos comprados manualmente) e **stubs** (`incomm`, `incentive_me`, `ding_connect`, `ifood_card`).
- **Agora**: operação compra os vales e importa pelo painel admin (`POST /admin/gift-cards/import`).
- **Depois**: implementar o provider real na mesma interface — nada muda no fluxo de doação.
- Pagamento: gateway Pix externo entra implementando `RealPixProvider implements PaymentProvider`
  (interface já existe em `src/modules/payments/providers/`). MockPix permanece só em dev/staging.

## 4. Trabalho restante (ordem de execução)

### A. Nuvem (Supabase) — "tudo mockado rodando na nuvem"
1. Criar projeto **Supabase PROD** + `DATABASE_URL`/`DIRECT_URL`.
2. Deploy da API (Railway/Render) com envs de produção; `prisma migrate deploy`.
3. Front: apontar `VITE_API_URL` para a API de produção.
4. **Conectar o restante do front**: doações/Pix, beneficiário, admin, ranking (hoje em fallback localStorage).
5. Desligar fallback mock em produção (`[FALLBACK MODE]` só em dev).

### B. Login social (backend pronto; falta credenciais + app nativo)
1. **Keystore Android** (`mealfy-release.jks`) → SHA-1/SHA-256 (destrava Google/Facebook + build assinado).
2. Google Cloud: tela de consentimento + Client IDs (Web/Android/iOS) → `GOOGLE_CLIENT_ID`.
3. Meta for Developers: app + Facebook Login → `FACEBOOK_APP_ID/SECRET`.
4. Apple: Services ID + chave Sign in with Apple → `APPLE_CLIENT_ID` (necessário para iOS; Play Store não exige).
5. Gov.br: credenciais OIDC (**exige CNPJ**) → `GOVBR_*`.
6. App: plugins nativos (`@codetrix-studio/capacitor-google-auth`, `@capacitor-community/facebook-login`, Sign in with Apple, `@capacitor/browser` p/ Gov.br) chamando `authService.signInWithOAuth(...)` (já existe).
7. Rodar migration `add_oauth_accounts` no banco de produção.

### C. Pagamento Pix (manual → automático)
1. Escolher gateway externo (sugestão: **Mercado Pago** ou **Asaas** — Pix com webhook no Brasil).
2. Implementar `RealPixProvider` (criação de cobrança + verificação de webhook — o fluxo de webhook idempotente já existe).
3. Conta PJ recebedora (com o cliente).
4. Operação manual de gift cards via painel admin + processo interno de reposição de estoque.

### D. Play Store (hardening + publicação)
1. **Segurança HTTP**: helmet + rate limit (login e `/payments/webhook`) + CORS restrito.
2. **Auth hardening**: refresh token + access curto; reset de senha por e-mail; remover contas demo/seed de produção.
3. **E-mail real** (Resend/SES/SendGrid): credenciais de entidade, reset de senha, aviso de vale liberado.
4. **Exclusão de conta** no app + URL pública da **política de privacidade** (exigências da Play Store).
5. Keystore de release + assinatura (CI `android-build.yml` já existe; gerar **AAB**).
6. Ficha da Play Store: screenshots, descrição, classificação, questionário de dados (Data Safety).
7. Testes das regras críticas (vale só após pagamento, 1/dia, webhook idempotente) + CI backend.
8. Observabilidade: logging estruturado + Sentry + alertas (estoque baixo, webhook falhando).

## 5. Exigências da Play Store que não podemos pular
- **Política de privacidade** (URL pública) — conteúdo jurídico com o cliente, mas o app precisa linkar.
- **Exclusão de conta e dados** iniciada pelo usuário dentro do app (política de 2024+).
- **Data Safety form** no Play Console (declara o que coletamos: nome, e-mail, localização aproximada, dados de menores → atenção redobrada).
- App com **login**: fornecer credenciais de teste para a revisão do Google.
- **Target SDK** atual (Android 15+) — verificar `capacitor.config.ts`/Gradle no build de release.

## 6. Fora do nosso escopo (cliente)
- LGPD/base legal/DPO/termos · CNPJ e conta PJ · contrato com gateway Pix · fornecedor de gift cards.
- Atenção: sem **CNPJ** não saem as credenciais do **Gov.br** nem conta PJ do gateway Pix — dependem do cliente.

## 7. Progresso executado (22/07/2026)

**Concluído e verificado:**
- Banco de produção no Supabase (`mealfy`, us-west-2): 16 tabelas, RLS habilitado, migrations sincronizadas (`add_oauth_accounts` já aplicada).
- Front conectado à API real: doações/Pix, beneficiário (vales decifrados), admin (aprovações, estoque e import de gift cards), ranking. Fallback mock só em dev/sem rede.
- Segurança HTTP: helmet + rate limit (global, login/register, webhook) + trust proxy — verificado em runtime.
- Keystore de release gerada (`android/mealfy-release.jks`, fora do git) com SHA-1/SHA-256 registrados para Google/Meta.
- **Exclusão de conta**: `DELETE /me` no backend (com audit log) + zona de perigo no Perfil com confirmação em 2 etapas — testado ponta a ponta no banco de produção (usuário de teste removido por esse fluxo).
- **Política de privacidade**: rota pública `/privacy` (sem login), linkada na tela de login e nas configurações do perfil. Texto é modelo técnico baseado no que o app coleta de fato — aguarda revisão do jurídico do cliente.

**Bloqueado aguardando o usuário/cliente:**
- Deploy da API (Railway/Render — conta dele) → depois `VITE_API_URL` de produção + rebuild do AAB.
- E-mail do admin de produção (banco está sem nenhum usuário — smoke removido).
- Credenciais Google/Meta/Apple/Gov.br (Gov.br exige CNPJ).
- Texto final da política de privacidade (jurídico).
