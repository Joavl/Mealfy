# Mealfy — Auditoria de Backend & Plano de Implementação (MVP)

> **Status:** Fase 0 (auditoria + documentação). Nenhum mock crítico foi substituído ainda.
> **Atualizado em:** 24/06/2026.
> **Escopo:** transformar o Mealfy de app 100% mockado/localStorage em um MVP com backend real
> (PostgreSQL + Prisma), mantendo o app mobile e o painel admin existentes.
>
> Documento-irmão (linguagem simples): [`COMO-FUNCIONA.md`](./COMO-FUNCIONA.md).
> Inventário detalhado de mocks pré-existente: [`MOCKS-PRODUCAO.md`](./MOCKS-PRODUCAO.md).

---

## Índice
1. [Resumo do produto](#1-resumo-do-produto)
2. [Fluxos principais](#2-fluxos-principais)
3. [Tudo que está mockado hoje](#3-tudo-que-está-mockado-hoje-auditoria)
4. [O que já funciona no front](#4-o-que-já-funciona-no-front)
5. [O que precisa virar backend](#5-o-que-precisa-virar-backend)
6. [Priorização dos mocks](#6-priorização-dos-mocks)
7. [Modelo de banco de dados](#7-modelo-de-banco-de-dados)
8. [Endpoints necessários](#8-endpoints-necessários)
9. [Fluxo real de Pix](#9-fluxo-real-de-pix)
10. [Fluxo real de gift card](#10-fluxo-real-de-gift-card)
11. [Entidade cadastrando beneficiário](#11-entidade-cadastrando-beneficiário)
12. [Beneficiário recebendo código](#12-beneficiário-recebendo-código)
13. [Doador visualizando impacto](#13-doador-visualizando-impacto)
14. [Regras críticas de negócio](#14-regras-críticas-de-negócio)
15. [Segurança e LGPD](#15-segurança-e-lgpd)
16. [Plano de deploy](#16-plano-de-deploy)
17. [Variáveis de ambiente](#17-variáveis-de-ambiente)
18. [Testes obrigatórios](#18-testes-obrigatórios)
19. [Pendências para o cliente](#19-pendências-para-o-cliente)
20. [Ordem de implementação](#20-ordem-de-implementação)

---

## 1. Resumo do produto

O Mealfy é um app mobile (React 19 + Vite, empacotado com Capacitor → APK Android) de **combate à fome infantil**. O apoiador escolhe uma **família com criança/adolescente** no mapa e faz uma **doação via Pix**. Após a **confirmação real do pagamento**, o backend libera para a família um **código de gift card** (vale-refeição/mercado) previamente comprado pela operação interna da Mealfy e importado pelo admin.

Princípios do MVP:
- **Sem integração automática** com iFood/99/Carrefour: estoque de códigos é comprado e **importado manualmente** pelo admin.
- O **beneficiário** vê o código no app; o **doador nunca vê o código** — vê apenas que a família recebeu o apoio.
- Cada família recebe **no máximo 1 doação/refeição por dia**.
- A família (ou a entidade responsável) **informa diariamente** o provider desejado (iFood, 99 Mercado, Carrefour).

> **Nomenclatura de provider (única):** nome **público** "iFood" / "99 Mercado" / "Carrefour"; identificador **interno** (banco/API/gift card/enum) `ifood` / `ninetynine` / `carrefour`. Usar sempre o interno no código.
- Beneficiário **não se autocadastra**: a **entidade** cadastra a família.
- **Backend é a fonte de verdade** — o front deixa de decidir elegibilidade e de liberar gift card.

### Estado atual do código (resumo da auditoria)
- **Front** (`src/`): completo e navegável de ponta a ponta. Cada serviço em `src/backend/services/*` segue o padrão **"API-first com fallback para mock"**: tenta a API (`VITE_API_URL`, default `http://localhost:3000`) e, na falha, cai em **mock + `localStorage`**.
- **Existe um scaffold de backend** em [`backend/`](../backend) (Express 4 + TypeScript + Zod), porém:
  - persistência é **arquivos JSON em disco** (`backend/src/database/mock-db.ts` → `data/*.json`), **não** PostgreSQL;
  - autenticação é por header **`x-user-id`** (sem JWT, sem hash de senha);
  - módulos existentes: `auth`, `families`, `indications`, `donations`, `ranking`, `admin`, `regions`;
  - **faltam** os módulos: `payments`, `gift-cards`, `entities`, `beneficiary`, `favorites`;
  - **não há etapa de pagamento**: a doação libera o gift card imediatamente.
- **Achado crítico:** [`donationService.createDonation()`](../src/backend/services/donationService.ts) gera o gift card (`giftCardService.releaseCode`) e marca a família como alimentada **no mesmo instante, sem qualquer Pix**. Isso **viola** a regra "nunca liberar gift card antes da confirmação do pagamento" e é o foco principal da migração.

> **Decisão de arquitetura:** manter o **Express + TypeScript** já presente no repo (em vez de criar outro framework) e **substituir o `MockDatabase` por Prisma + PostgreSQL**, adicionando JWT e os módulos faltantes. Reaproveita o que já existe e minimiza retrabalho.

---

## 2. Fluxos principais

1. **Operação interna** compra gift cards (iFood/99/Carrefour) fora do app.
2. **Admin** importa os códigos em lote no painel (`POST /admin/gift-cards/import`).
3. **Entidade** cadastra a **família/beneficiário** (com ≥1 dependente 0–17) → família entra em análise.
4. **Admin/entidade** aprova a família.
5. **Família** (ou entidade responsável) informa diariamente o **provider** (iFood / 99 Mercado / Carrefour → interno `ifood`/`ninetynine`/`carrefour`).
6. **Apoiador** escolhe a família e doa via **Pix** (`POST /donations`).
7. **Backend** cria `donation: pending_payment` + cobrança Pix e devolve QR Code / copia-e-cola.
8. **Apoiador paga**; o gateway envia **webhook** → backend confirma (idempotente).
9. **Backend** libera um **código disponível** do provider escolhido (reserva → uso).
10. **Beneficiário** vê o código no app; **doador** vê só "família recebeu o apoio".
11. **Família** fica **alimentada no dia** (bloqueia nova doação até o reset das 08h).

---

## 3. Tudo que está mockado hoje (auditoria)

Varredura por: `localStorage`, `mock`, `mockData`, `fake`, `seed`, `fallback`, `families_db`, `giftCardInventory`, `donationService`, `familyService`, auth/ranking/user/payment/gov/email/admin/entity/beneficiary mock.

> Legenda de prioridade: 🔴 Crítica · 🟠 Alta · 🟡 Média · 🟢 Baixa

| # | Mock | Arquivo(s) | O que simula | Fluxo que depende | Risco se continuar mockado | Como migrar | Prioridade |
|---|------|-----------|--------------|-------------------|----------------------------|-------------|:---:|
| 1 | **Pagamento (inexistente)** | `pages/DonationChoice.tsx`, `services/donationService.ts` | Não há gateway nem etapa de pagamento; "doar" já entrega o vale | Doação inteira | **Dinheiro sem rastreio; vale liberado sem pagar** | Criar `payments` + `PaymentProvider` + Pix (mock→real) com webhook idempotente | 🔴 |
| 2 | **Doação libera vale na hora** | `services/donationService.ts` (`createDonation`, `generateGiftCard`) | Cria doação e gift card sincronamente, sem pagamento | Doação, "alimentada por" | Vale entregue sem confirmação financeira | `POST /donations` cria `pending_payment`; liberação só no webhook `paid` | 🔴 |
| 3 | **Estoque de gift cards** | `mockData/giftCardInventory.ts`, `services/giftCardService.ts` | Códigos fictícios; `releaseCode` marca `used` na hora (sem `reserved`) | Liberação do vale | Reuso/duplicidade; código fictício; sem auditoria | Tabelas `gift_cards`/`batches`; import admin; reserva→uso transacional; criptografia | 🔴 |
| 4 | **Família alimentada no dia** | `utils/timeUtils.ts` (`isBeneficiaryEligible`, reset 08h), `familyService.markFamilyFed` | Regra 1x/dia só no cliente | Bloqueio diário | Burlável (limpa localStorage → doa de novo) | Mover regra para o backend (transação + índice por dia) | 🔴 |
| 5 | **Famílias / beneficiários** | `mockData/families.ts` (23 famílias), `services/familyService.ts`, `families_db` | Famílias, status, indicações | Mapa, ficha, doação | Dados não confiáveis; sem aprovação real | Tabelas `families`/`family_dependents`; endpoints + aprovação | 🔴 |
| 6 | **Entidade** | `services/entityService.ts`, `pages/EntityDashboard.tsx`, `entities_db` | Cadastro/gestão de entidades e suas famílias | Cadastro de família | Qualquer um "vira" entidade; sem moderação | Tabela `entities` + endpoints `/entity/*` + RBAC | 🟠 |
| 7 | **Validação NIS / CadÚnico** | `pages/RegisterFamily.tsx` (`verifyNis`) | Stub: sempre "localizado" após ~1,2s | Cadastro de família | Falsa sensação de verificação oficial | Manter **mock declarado** + campos `verificationStatus`/`dataSource` (sem integração real) | 🟡 |
| 8 | **Admin (painel)** | `hooks/useAdminData.ts`, `services/adminService.ts` (localStorage) | Dashboard, moderação, stories | Operação admin | Sem moderação real; dados voláteis | Endpoints `/admin/*` + RBAC + audit logs | 🟠 |
| 9 | **Admin Supabase órfão** | `hooks/useAdminDashboard.ts`, `lib/supabase.ts` | Importa Supabase mas **não é usado** | — | Confusão de arquitetura | Decidir: remover ou consolidar (recomendado **remover**) | 🟢 |
| 10 | **Autenticação** | `services/authProvider.ts`, `authService.ts`, `mockData/users.ts` (`MOCK_PASSWORD='123456'`) | Login e-mail/senha, sessão `current_user` no localStorage | Tudo (login) | Senha única em claro; sem sessão server | `POST /auth/register|login` + bcrypt + JWT | 🟠 |
| 11 | **Login Google/Meta/Gov.br** | `components/ui/GoogleMockModal.tsx`, `GovBrMockModal.tsx`, `Auth.tsx` | Modais visuais "logam" um mock | Login social | Não autentica de verdade | OAuth real (fase futura); manter desabilitado/mock declarado no MVP | 🟡 |
| 12 | **Favoritos** | `context/AppContext.tsx` (`toggleSavedFamily` → `savedFamilyIds` em `current_user`) | Lista de famílias salvas no usuário | Mapa/perfil | Perde ao trocar device; sem unicidade | Tabela `favorites` (`donorId+familyId` único) + endpoints | 🟡 |
| 13 | **Histórico de doações** | `services/donationService.ts` (`getDonationHistoryByUser`), `donations_db` | Histórico no localStorage | Perfil | Histórico não confiável | Derivar de `donations` reais (status `completed`) | 🟠 |
| 14 | **Ranking / badges** | `services/rankingService.ts`, `mockData/users.ts` | Ordena mock por `totalDonated`; badges calculados no front | Home/Perfil | Ranking não confiável | `donor_profiles` + cálculo server (agregação de `donations`) | 🟡 |
| 15 | **Stories (Top 20)** | `context/AppContext.tsx` (`stories_v1`) | Carrossel de destaques editável | Home | Volátil | Endpoint de destaques (derivado do ranking ou curado pelo admin) | 🟡 |
| 16 | **E-mail à entidade** | `entity_email_log` (localStorage) | Registra evento visual; **não envia e-mail** | Onboarding entidade | Entidade não recebe credenciais | `EmailProvider` (mock→real, ex. Resend/SES) | 🟡 |
| 17 | **Compartilhar / QR Code** | `Home.tsx`, `Success.tsx`, `Profile.tsx` | Toasts simulados; QR é SVG decorativo | Compartilhamento | Sem deep link real | Deep link/redirect real (fase futura) | 🟢 |
| 18 | **Recorrência** | `services/recurrenceService.ts`, `pages/Recurrence.tsx`, `recurrences_db` | "Apoiar de novo" como intenção | Recorrência | Confundir com débito automático | Tabela `recurring_support_intents` (lembrete, **sem débito**) | 🟡 |
| 19 | **Latência artificial** | `utils/delay.ts` (`randomDelay`) | Atrasos para "parecer real" | UX | Nenhum (cosmético) | Remover quando a API real responder | 🟢 |
| 20 | **Comunidades/Regiões** | `mockData/communities.ts`, `services/communityService.ts`, módulo `regions` (backend) | Comunidades e regiões base | Filtros do mapa | Baixo | Tabela/endpoint simples (ou seed fixo) | 🟢 |

**Chaves de `localStorage` (prefixo `mealfy_`):** `current_user`, `users_db`, `registered_users`, `mock_credentials`, `families_db`, `families_seed_version`, `donor_indications_db`, `entities_db`, `communities_db`, `donations_db`, `giftcards_db`, `giftcard_inventory_v1`, `recurrences_db`, `stories_v1`, `entity_email_log`, `savedFamilyIds` (dentro de `current_user`).

---

## 4. O que já funciona no front

- **UI/UX completa e navegável** dos 4 papéis (donor, entity, beneficiary, admin), com rotas protegidas por papel (`PrivateRoute` em `src/App.tsx`).
- **Geolocalização real** (`@capacitor/geolocation`) e **mapa real** (Leaflet + tiles OpenStreetMap/Carto).
- **Regras de negócio client-side** implementadas (precisam migrar): limite diário (reset 08h), elegibilidade 0–17, unicidade de código.
- **Camada de API já preparada**: `src/api/*Api.ts` + `apiClient.ts` (envia `x-user-id`, lê `VITE_API_URL`). O front **já tenta a API antes do mock** — então conectar o backend é, em boa parte, "fazer a API responder".
- **Cadastro multi-step** (typeform) por papel, máscaras CPF/CNPJ, validações de formulário.
- **Empacotamento**: Vite build + `npx cap sync android` + APK via CI (GitHub Actions).
- **Scaffold de backend Express** com estrutura modular (controllers/services/validators/middlewares) — boa base para evoluir.

---

## 5. O que precisa virar backend

| Domínio | Hoje | Alvo |
|--------|------|------|
| **Pagamento Pix** | Inexistente | `payments` + `PaymentProvider` (mock→real) + webhook idempotente |
| **Doação** | Libera vale na hora | `donations` com máquina de estados; vale só após `paid` |
| **Gift cards** | Inventário fictício no localStorage | `gift_cards`/`batches`; import admin; reserva/uso transacional; cripto |
| **Regra diária** | Cliente | Transação no backend (índice único família+dia) |
| **Famílias/dependentes** | localStorage | `families`/`family_dependents` + aprovação |
| **Entidades** | localStorage | `entities` + RBAC |
| **Auth/sessão** | localStorage + senha fixa | bcrypt + JWT |
| **Favoritos** | Campo no usuário | `favorites` (constraint única) |
| **Histórico/ranking** | localStorage | Derivado de `donations` reais |
| **Admin** | localStorage | `/admin/*` + audit logs |
| **E-mail/notificações** | Log visual | `EmailProvider` (mock→real) |
| **Recorrência** | Intenção local | `recurring_support_intents` (lembrete) |

**Permanece mock/declarado no MVP (com base legal pendente):** Gov.br/CadÚnico/NIS, OAuth social, integração automática de gift cards, deep link/QR real.

---

## 6. Priorização dos mocks

| Ordem | Mock | Prioridade | Fase |
|:---:|------|:---:|:---:|
| 1 | Pagamento (Pix) | 🔴 Crítica | 5 |
| 2 | Doação | 🔴 Crítica | 4 |
| 3 | Gift cards | 🔴 Crítica | 3 |
| 4 | Família alimentada no dia | 🔴 Crítica | 4 |
| 5 | Beneficiário/família | 🔴 Crítica | 2 |
| 6 | Entidade | 🟠 Alta | 2 |
| 7 | Admin | 🟠 Alta | 3/6 |
| 8 | Autenticação | 🟠 Alta | 1/2 |
| 9 | Favoritos | 🟡 Média | 6 |
| 10 | Histórico | 🟠 Alta | 4 |
| 11 | Ranking/badges | 🟡 Média | 6 |
| 12 | Gov.br/NIS | 🟡 Média (mock declarado) | 2 |
| 13 | E-mails/notificações | 🟡 Média | 6 |

> Observação: embora "Pagamento" seja a prioridade #1 de negócio, a **ordem de construção** é gift cards → doação → Pix (3→4→5), porque o Pix só faz sentido depois de existir doação e estoque para liberar. A criticidade não muda; a sequência técnica sim.

---

## 7. Modelo de banco de dados

PostgreSQL + Prisma. Esboço de `schema.prisma` (campos conforme o mínimo solicitado; valores monetários em **centavos `Int`** para evitar float):

```prisma
// enums
enum UserRole { donor entity beneficiary admin }
enum UserStatus { active pending suspended blocked }
enum GiftCardProvider { ifood ninetynine carrefour } // "99" -> ninetynine
enum FamilyApprovalStatus { pending approved rejected blocked }
enum FamilyVerificationStatus { unverified gov_mock manual }
enum FamilySupportStatus { needs_help supported fed }
enum DataSource { gov manual }
enum LocationPrecision { approximate exact_admin_only }
enum DonationStatus {
  pending_payment payment_confirmed gift_card_reserved
  gift_card_released completed failed canceled refunded
}
enum PaymentStatus { pending paid expired canceled failed refunded }
enum PaymentMethod { pix }
enum GiftCardStatus { available reserved used expired invalid }
enum RecurringStatus { active paused canceled }

model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String?
  role         UserRole
  avatarUrl    String?
  instagram    String?
  phone        String?
  status       UserStatus @default(active)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  donorProfile DonorProfile?
  entity       Entity?
  favorites    Favorite[]
}

model DonorProfile {
  id                 String   @id @default(uuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id])
  publicSlug         String   @unique
  totalDonations     Int      @default(0) // centavos
  totalFamiliesHelped Int     @default(0)
  rankingPosition    Int?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model Entity {
  id             String   @id @default(uuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id])
  name           String
  cnpj           String   @unique
  responsibleName String
  email          String
  phone          String?
  status         UserStatus @default(pending)
  families       Family[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Family {
  id                   String   @id @default(uuid())
  responsibleName      String
  displayName          String
  entityId             String?
  entity               Entity?  @relation(fields: [entityId], references: [id])
  nisMasked            String?
  cpfMasked            String?
  city                 String
  state                String
  neighborhood         String?
  community            String?
  approximateAddress   String?
  fullAddressEncrypted String?  // só admin; criptografado
  latitude             Float?
  longitude            Float?
  locationPrecision    LocationPrecision @default(approximate)
  preferredGiftCardProvider GiftCardProvider?
  todayRequestedProvider    GiftCardProvider?
  supportStatus        FamilySupportStatus @default(needs_help)
  lastFedAt            DateTime?
  lastDonationId       String?
  lastDonorId          String?
  lastDonorName        String?
  lastDonorInstagram   String?
  lastGiftCardProvider GiftCardProvider?
  verificationStatus   FamilyVerificationStatus @default(unverified)
  approvalStatus       FamilyApprovalStatus @default(pending)
  dataSource           DataSource @default(manual)
  socialDescription    String?
  needToday            Boolean  @default(true)
  dependents           FamilyDependent[]
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

model FamilyDependent {
  id             String   @id @default(uuid())
  familyId       String
  family         Family   @relation(fields: [familyId], references: [id])
  name           String
  age            Int
  relationship   String?
  isEligibleMinor Boolean @default(false) // age 0..17
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Donation {
  id            String   @id @default(uuid())
  donorId       String
  familyId      String
  amount        Int      // centavos
  provider      GiftCardProvider
  status        DonationStatus @default(pending_payment)
  paymentId     String?  @unique
  giftCardId    String?  @unique
  failureReason String?
  createdAt     DateTime @default(now())
  completedAt   DateTime?
  canceledAt    DateTime?
  // índice único anti-duplo-apoio no dia: ver "fedDateKey" abaixo
}

model Payment {
  id               String   @id @default(uuid())
  donationId       String   @unique
  provider         String   // nome do gateway
  method           PaymentMethod @default(pix)
  status           PaymentStatus @default(pending)
  amount           Int
  pixQrCode        String?
  pixCopyPaste     String?
  externalPaymentId String?  @unique
  expiresAt        DateTime?
  paidAt           DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  events           PaymentEvent[]
}

model PaymentEvent {
  id              String   @id @default(uuid())
  paymentId       String
  payment         Payment  @relation(fields: [paymentId], references: [id])
  externalEventId String   @unique // garante idempotência
  eventType       String
  payload         Json
  processedAt     DateTime?
  createdAt       DateTime @default(now())
}

model GiftCard {
  id            String   @id @default(uuid())
  provider      GiftCardProvider
  codeEncrypted String   // nunca em claro
  codeMasked    String   // ex: "****-1234"
  codeHash      String   @unique // anti-duplicidade na importação
  amount        Int
  status        GiftCardStatus @default(available)
  batchId       String
  batch         GiftCardBatch @relation(fields: [batchId], references: [id])
  reservedAt    DateTime?
  usedAt        DateTime?
  expiresAt     DateTime?
  donationId    String?  @unique
  familyId      String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model GiftCardBatch {
  id              String   @id @default(uuid())
  provider        GiftCardProvider
  batchName       String
  importedByUserId String
  totalCodes      Int
  amount          Int
  createdAt       DateTime @default(now())
  giftCards       GiftCard[]
}

model GiftCardEvent {
  id          String   @id @default(uuid())
  giftCardId  String
  eventType   String   // imported | reserved | released | invalidated | resent
  userId      String?
  donationId  String?
  metadata    Json?
  createdAt   DateTime @default(now())
}

model Favorite {
  id        String   @id @default(uuid())
  donorId   String
  donor     User     @relation(fields: [donorId], references: [id])
  familyId  String
  createdAt DateTime @default(now())
  @@unique([donorId, familyId])
}

model RecurringSupportIntent {
  id                  String   @id @default(uuid())
  donorId             String
  familyId            String
  status              RecurringStatus @default(active)
  type                String   @default("daily_reminder")
  requiresConfirmation Boolean @default(true)
  maxDailyAmount      Int?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model AuditLog {
  id          String   @id @default(uuid())
  actorUserId String?
  action      String
  entityType  String
  entityId    String?
  metadata    Json?
  createdAt   DateTime @default(now())
}
```

**Regras embutidas no schema/serviços:**
- Família só vai para aprovação com **≥1 `FamilyDependent` com `isEligibleMinor=true`** (idade 0–17).
- **Anti-duplo-apoio no dia:** índice único derivado `(familyId, fedDate)` — implementado com uma coluna `fedDateKey` (date) preenchida na liberação do vale, ou tabela `daily_feed_log(familyId, date)` com `@@unique`. Reset operacional às **08h** (timezone America/Sao_Paulo).
- **Gift card:** transição `available → reserved → used` é **transacional** (`SELECT ... FOR UPDATE` / update condicional) para impedir entrega do mesmo código a dois beneficiários; `used`/`invalid` nunca voltam a `available`.
- **Idempotência de webhook:** `PaymentEvent.externalEventId @unique` — evento repetido é ignorado.
- **Anti-duplicidade na importação:** `GiftCard.codeHash @unique`.

---

## 8. Endpoints necessários

> ✅ já existe no scaffold · 🔶 existe parcial (file-mock) · 🆕 novo

### Auth
| Método | Rota | Status | Observação |
|---|---|:---:|---|
| POST | `/auth/register` | 🔶 | + bcrypt + JWT |
| POST | `/auth/login` | 🆕 | retorna JWT |
| POST | `/auth/logout` | 🆕 | invalida sessão/refresh |
| GET | `/me` | 🔶 | hoje via `x-user-id` |
| PATCH | `/me` | 🔶 | |

### Families
`GET /families` 🔶 · `GET /families/map` 🆕 · `GET /families/:id` 🔶 · `POST /families` 🔶 · `PATCH /families/:id` 🔶 · `POST /families/:id/approve` 🆕 · `POST /families/:id/reject` 🆕 · `POST /families/:id/block` 🆕 · `POST /families/:id/request-daily-support` 🆕

### Donations
`POST /donations` 🔶 (reescrever p/ `pending_payment`) · `GET /donations/:id` 🆕 · `GET /me/donations` 🔶 · `GET /families/:id/donations` 🆕 · `POST /donations/:id/cancel` 🆕

### Payments 🆕 (módulo inteiro)
`POST /payments/:id/simulate-paid` (**apenas dev**) · `POST /payments/webhook` · `GET /payments/:id`

### Gift cards (admin) 🆕
`GET /admin/gift-cards` · `GET /admin/gift-cards/stock` · `POST /admin/gift-cards/import` · `POST /admin/gift-cards/:id/invalidate` · `GET /admin/gift-card-batches`

### Beneficiary 🆕
`GET /beneficiary/me` · `GET /beneficiary/gift-cards` · `GET /beneficiary/gift-cards/:id`

### Entity 🆕
`GET /entity/families` · `POST /entity/families` · `PATCH /entity/families/:id` · `GET /entity/dashboard`

### Favorites 🆕
`GET /me/favorites` · `POST /families/:id/favorite` · `DELETE /families/:id/favorite`

### Admin
`GET /admin/dashboard` 🔶 · `GET /admin/audit-logs` 🆕 · `GET /admin/families` 🔶 · `GET /admin/donations` 🆕 · `GET /admin/payments` 🆕 · `GET /admin/entities` 🆕

> **Auth nas rotas:** middleware JWT + `roleGuard` (já existe `backend/src/shared/middlewares/roleGuard.ts`). O `apiClient` do front passará a enviar `Authorization: Bearer <token>` em vez de `x-user-id`.

---

## 9. Fluxo real de Pix

```
Doador escolhe família
      │
      ▼
POST /donations { familyId, provider, amount }
      │  Backend valida (autenticado, família aprovada, dependente 0–17,
      │  não alimentada hoje, provider válido, há estoque do provider)
      ▼
cria Donation(status=pending_payment)
      │
      ▼
PaymentProvider.createPixPayment() → Payment(status=pending, qrCode, copiaECola, expiresAt)
      │
      ▼
retorna { donationId, qrCode, pixCopyPaste, expiresAt }  (SEM liberar vale)
      │
   Doador paga via app do banco
      │
      ▼
Gateway → POST /payments/webhook  (assinado)
      │  valida assinatura (PAYMENT_WEBHOOK_SECRET)
      │  idempotência: PaymentEvent.externalEventId @unique
      ▼
Transação atômica:
   Payment.status = paid (paidAt)
   reserva GiftCard available do provider (status=reserved)
   marca GiftCard.status = used (usedAt, donationId, familyId)
   Donation.status = completed (completedAt, giftCardId)
   Family: lastFedAt=now, supportStatus=fed, "alimentada por" (donor)
   registra daily_feed_log(familyId, hoje)
   AuditLog: process_payment, release_gift_card
      │
      ├─► Beneficiário: vê o código no app
      └─► Doador: vê "Família recebeu o apoio" (sem o código)
```

**Regra inviolável:** o gift card **nunca** é liberado antes de `Payment.status = paid` confirmado por webhook.

**Camada `PaymentProvider` (abstrata):**
```ts
interface PaymentProvider {
  createPixPayment(input: { amount: number; donationId: string; expiresInMin: number }):
    Promise<{ externalPaymentId: string; pixQrCode: string; pixCopyPaste: string; expiresAt: Date }>;
  getPaymentStatus(externalPaymentId: string): Promise<PaymentStatus>;
  handleWebhook(rawBody: Buffer, signature: string):
    Promise<{ externalEventId: string; externalPaymentId: string; type: string; status: PaymentStatus }>;
  refundPayment?(externalPaymentId: string): Promise<void>; // futuro
}
```
- **`MockPixPaymentProvider`** (dev): gera QR fake; expõe `POST /payments/:id/simulate-paid` e/ou webhook manual; simula `pending`/`paid`/`expired`.
- **`RealPixPaymentProvider`**: implementado quando o gateway for escolhido (ver §19). Seleção por `PAYMENT_PROVIDER`.

---

## 10. Fluxo real de gift card

**Importação (admin):** `POST /admin/gift-cards/import { provider, amount, batchName, codes[] }`
→ cria `GiftCardBatch`; para cada código: valida duplicidade por `codeHash`, **criptografa** (`ENCRYPTION_KEY`), grava `codeEncrypted` + `codeMasked` + `status=available`; `AuditLog: import_gift_cards`.

**Liberação (no webhook `paid`):** seleciona 1 `available` do provider **com lock transacional** → `reserved` → `used` (vinculado a `donationId`/`familyId`). Falta de estoque ⇒ doação não completa e gera alerta (o ideal é validar estoque **antes** de criar a cobrança, em `POST /donations`).

**Garantias:** código `used`/`invalid` nunca volta a `available`; um código serve a **um** beneficiário; `GiftCardEvent` registra todo o ciclo; alerta de **estoque baixo** por provider.

**Visibilidade:**
- **Beneficiário:** código completo + provider + instruções + data/hora de liberação.
- **Admin:** estoque por provider, lista disponíveis/usados (**mascarados** por padrão), invalidar, lotes, histórico.
- **Doador:** **nunca** vê o código.

---

## 11. Entidade cadastrando beneficiário

1. Entidade autenticada (papel `entity`, `status=approved`) → `POST /entity/families`.
2. Payload: responsável, contato, endereço aproximado, **dependentes** (nome, idade, parentesco), provider preferido, NIS/CPF (**mascarados** no armazenamento).
3. Backend valida **≥1 dependente 0–17** (`isEligibleMinor`); sem isso ⇒ **não pode ir para aprovação**.
4. Família entra como `approvalStatus=pending`, `verificationStatus` = `manual` (ou `gov_mock` se usada a simulação de NIS).
5. **Aprovação manual** por admin/entidade: `POST /families/:id/approve` → `approved` (auditado). Reprovar/bloquear: `/reject`, `/block`.
6. Só famílias `approved` aparecem para doação/mapa.

> NIS/Bolsa Família **não aprova sozinho** — é apenas um sinal; a aprovação é sempre **manual**.

---

## 12. Beneficiário recebendo código

1. Beneficiário autenticado (papel `beneficiary`) vinculado à família.
2. `GET /beneficiary/gift-cards` lista os vales liberados para a família (ordem: mais recente primeiro).
3. `GET /beneficiary/gift-cards/:id` retorna **código completo** + provider + instruções + `releasedAt`.
4. A família **escolhe diariamente** o provider (`POST /families/:id/request-daily-support { provider }`), gravado em `todayRequestedProvider` — é esse provider que será liberado ao receber doação no dia.
5. Após o vale do dia, a família fica `fed` e não recebe outro até o reset (08h).

---

## 13. Doador visualizando impacto

1. `GET /me/donations` → histórico de doações **reais** (status `completed`), **sem** campo de código.
2. Tela de sucesso e ficha mostram:
   - **"Família recebeu o apoio."**
   - **"Vale iFood enviado para a família."** (provider, sem código)
   - **"Alimentada por você"** quando aplicável (de `lastDonorId`).
3. Ranking/badges derivados de `donor_profiles` (agregação server-side de doações concluídas).
4. **Garantia de privacidade:** nenhuma resposta de doador inclui `code`/`codeEncrypted`; serialização por papel (DTOs distintos para donor × beneficiary × admin).

---

## 14. Regras críticas de negócio

1. **Gift card só após Pix confirmado** (webhook `paid`). Nunca antes.
2. **1 doação/refeição por família por dia** — autoritativa no **backend** (transação + índice único por dia, reset 08h).
3. **Código único, sem reuso** — `used`/`invalid` nunca voltam; um código → um beneficiário.
4. **Elegibilidade 0–17** — família só aprovável com ≥1 dependente menor; validado no backend.
5. **Aprovação manual** de família (NIS não aprova sozinho).
6. **Webhook idempotente** — `externalEventId` único; evento repetido não duplica doação/vale.
7. **Importação sem duplicidade** — `codeHash` único.
8. **Doador nunca vê código**; **beneficiário sempre vê**.
9. **Estoque conferido antes de cobrar** — se não há código do provider, a doação não inicia.
10. **Toda ação crítica gera AuditLog**.

---

## 15. Segurança e LGPD

**Segurança técnica**
- Backend é a **fonte de verdade**; o front não decide elegibilidade nem libera vale.
- **JWT** (access curto + refresh), senhas com **bcrypt/argon2**.
- **RBAC**: `roleGuard` por rota; entidade × admin com permissões distintas.
- **Webhook** com verificação de assinatura (`PAYMENT_WEBHOOK_SECRET`) + idempotência.
- **Criptografia** de códigos de gift card em repouso (`ENCRYPTION_KEY`, AES-256-GCM); nunca em claro nem em logs.
- **Validação de payloads com Zod** em todas as rotas (já presente no scaffold).
- Rate limiting em `/auth/*` e `/payments/webhook`.

**LGPD / privacidade de dados**
- **Minimização**: armazenar CPF/NIS **mascarados** (`cpfMasked`, `nisMasked`); valor completo, se imprescindível, **criptografado** e restrito ao admin.
- **Endereço completo** nunca exposto ao doador — doador vê só `neighborhood`/aproximado (`locationPrecision`).
- **Dados de menores**: tratamento sensível — só entidade/admin acessam dependentes; nunca expostos publicamente.
- **Logs sem PII sensível** (sem código de vale, sem CPF/NIS completo).
- **Base legal**: cadastro de beneficiário feito por **entidade** com consentimento/representação; documentar finalidade e retenção.
- **Direitos do titular**: prever endpoints/processo de exclusão e exportação (fase futura).
- **Gov.br/CadÚnico/NIS**: **não** integrar sem **convênio/base legal** — manter mock declarado (ver §19).

---

## 16. Plano de deploy

**Topologia MVP**
- **API** (Express/TS) em **Railway** ou **Render** (web service Node).
- **PostgreSQL** gerenciado: **Supabase** ou **Railway/Render Postgres**.
- **Admin web** (já existente) apontando para a API real (`ADMIN_URL` no CORS).
- **App mobile**: build com `VITE_API_URL=https://api.mealfy...`, `cap sync android`, APK via CI.

**Passos**
1. Provisionar Postgres → obter `DATABASE_URL`.
2. Deploy da API (build `tsc`, start `node dist/server.js`).
3. `prisma migrate deploy` (migrations) no ambiente.
4. `prisma db seed` (admin inicial, regiões, lote de gift cards de teste **só em staging**).
5. Configurar **CORS** (`CORS_ORIGIN` = origens do app/admin).
6. **Healthcheck** `GET /health` (já existe) para o orquestrador.
7. **Logs** estruturados (pino/winston) + correlação de request.
8. **Backup** automático do Postgres (snapshot diário do provedor).
9. Configurar **webhook URL** pública do gateway → `/payments/webhook`.
10. Apontar app/admin para a API e validar ponta a ponta.

**Ambientes:** `dev` (Pix mock, simulate-paid liberado) · `staging` (gateway sandbox) · `prod` (gateway real, sem rotas de simulação).

---

## 17. Variáveis de ambiente

`backend/.env.example`:
```env
DATABASE_URL=
JWT_SECRET=
APP_URL=
ADMIN_URL=
CORS_ORIGIN=
PAYMENT_PROVIDER=mock
PAYMENT_WEBHOOK_SECRET=
PIX_EXPIRATION_MINUTES=30
EMAIL_PROVIDER=mock
EMAIL_API_KEY=
ENCRYPTION_KEY=
NODE_ENV=
```
Front (`.env` do app): `VITE_API_URL=` (URL da API real).

> `simulate-paid` e seeds de gift card só habilitados quando `NODE_ENV !== production`.

---

## 18. Testes obrigatórios

Cobertura mínima (integração, com banco de teste):

1. Criar família por entidade.
2. Aprovar família com dependente 0–17.
3. **Bloquear** aprovação de família **sem** dependente elegível.
4. Importar lote de gift cards (sem duplicar `codeHash`).
5. Ver estoque por provider.
6. Criar doação Pix **pendente** (sem liberar vale).
7. Simular Pix **pago** (`simulate-paid`/webhook).
8. Liberar gift card **após** pagamento.
9. Beneficiário **visualiza** o código.
10. Doador **não** visualiza o código (DTO sem `code`).
11. Família fica **alimentada no dia**.
12. Segunda doação no **mesmo dia** é **bloqueada**.
13. Reuso do **mesmo código** é **bloqueado**.
14. **Webhook duplicado** não duplica doação/vale (idempotência).
15. Filtro do **mapa** retorna famílias corretas (aprovadas + com coords).
16. Admin vê doações, pagamentos e estoque.
17. **AuditLog** registra ações críticas.

Além de `npx tsc --noEmit` (front e backend) e `npm run build` verdes.

---

## 19. Pendências para o cliente

| Tema | Decisão necessária |
|---|---|
| **Gateway Pix** | Escolher provedor (ex.: Mercado Pago, Asaas, Gerencianet/Efí, Pagar.me, Stripe BR). Define `RealPixPaymentProvider`, formato do webhook e taxas. |
| **Conta bancária / recebedor** | Em nome de quem o Pix é recebido (PJ Mealfy?) e regras fiscais/repasse. |
| **Estoque de gift cards** | Quem compra, com que valor e periodicidade; SLA de reposição; nível de alerta de estoque baixo. |
| **Hospedagem** | Railway vs Render vs Supabase (custo/limites do MVP). |
| **E-mail** | Provedor (Resend/SES/SendGrid) para credenciais de entidade e notificações. |
| **Gov.br/CadÚnico/NIS** | Sem convênio/base legal não integrar. Confirmar que permanece **mock declarado**. |
| **Política de reembolso** | Há reembolso de Pix? (define `refundPayment`). |
| **Retenção/LGPD** | Tempo de retenção de PII, processo de exclusão, encarregado (DPO). |
| **Login social** | Manter desabilitado no MVP ou priorizar OAuth (Google/Meta/Gov.br)? |

---

## 20. Ordem de implementação

| Fase | Entregas | Saída verificável |
|:---:|---|---|
| **0** ✅ | Auditoria + `BACKEND_AUDIT_AND_IMPLEMENTATION_PLAN.md` + `COMO-FUNCIONA.md`; mapa de mocks e de endpoints | **este documento** |
| **1** ✅ | Backend isolado em `/backend` (Express+TS), **Prisma/PostgreSQL** (substitui `mock-db`); `/health` com status do banco; `.env.example`; schema (14 tabelas/13 enums) + migration inicial; seed idempotente; Dockerfile + deploy Railway/Render | API sobe; `/health` ok; `prisma validate`/`generate`/`build` verdes; `migrate`/`seed` rodam ao apontar p/ um Postgres |
| **2** ✅ | Auth (bcrypt+JWT) + RBAC; `/me`; entidades; famílias + dependentes; **regra 0–17**; aprovação manual (approve/reject/block); mapa/ficha sem PII; provider diário; audit logs | Testes 1–3, 15 ✅ |
| **3** ✅ | `gift_cards`/`batches`; **import admin** (dedupe via codeHash); **estoque** + listagem mascarada; **AES-256-GCM** + SHA-256 + mask; **invalidação**; **reserva/liberação transacional** (`FOR UPDATE SKIP LOCKED`). Validado no Supabase. | Testes 4, 5, 13 ✅ |
| **4** ✅ | `donations` com máquina de estados; **bloqueio diário** (reset 08h SP, UPDATE condicional atômico); liberação de vale **só após confirmação** (mock dev/admin); "alimentada por"; histórico do doador (sem código); **endpoint do beneficiário** (vê o código). Validado no Supabase. | Testes 11, 12 ✅ |
| **5** ✅ | `payments` + `PaymentProvider` abstrato + **MockPix** (QR/copia-e-cola); cobrança na doação; **webhook idempotente assinado** (HMAC + `externalEventId` único); `simulate-paid` (dev); expiração; vale só após `paid`. Validado no Supabase. | Testes 6, 7, 8, 14 ✅ |
| **6** | Conectar front/admin à API (substituir mocks por API com fallback controlado); favoritos; ranking; e-mail | Testes 9, 10, 16, 17 |
| **7** | Deploy (API + Postgres + migrations + seed); APK apontando para API real | App real ponta a ponta |

**Definition of Done (não concluir se):** vale liberado antes do pagamento · código reutilizável · regra diária só no front · doador vê código · beneficiário não vê código · admin não importa gift cards · webhook não idempotente · família sem criança/adolescente aprovada · docs não criadas · backend sem plano de deploy.

---

*Fim do plano. Próximo passo sugerido: aprovar a Fase 1 (estrutura + Prisma/PostgreSQL).*
