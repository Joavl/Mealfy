# Mealfy — Fases do Backend (roadmap & changelog)

> Visão consolidada de **todas as fases** da construção do backend real (`/backend`),
> com objetivo, entregas, commits e status. Atualizado em **25/06/2026**.
>
> Documentos relacionados:
> - Plano técnico completo: [`BACKEND_AUDIT_AND_IMPLEMENTATION_PLAN.md`](./BACKEND_AUDIT_AND_IMPLEMENTATION_PLAN.md)
> - Produto em linguagem simples: [`COMO-FUNCIONA.md`](./COMO-FUNCIONA.md)
> - Inventário de mocks (handoff): [`MOCKS-PRODUCAO.md`](./MOCKS-PRODUCAO.md)
> - Setup/rotas do backend: [`../backend/README.md`](../backend/README.md)

## Resumo

| Fase | Tema | Status |
|---|---|:---:|
| 0 | Auditoria & documentação | ✅ |
| 1 | Fundação da API (Express + TS + Prisma + PostgreSQL) | ✅ |
| 1G | Validação em PostgreSQL real (local) | ✅ |
| 2 | Auth + usuários + entidades + famílias + aprovação + audit | ✅ |
| 2H | Validação no Supabase cloud (ao vivo) | ✅ |
| 3 | Gift cards reais (cripto, importação, estoque, reserva) | ✅ |
| 4 | Doações + bloqueio diário + liberação de vale + beneficiário | ✅ |
| 5 | Pagamentos Pix (MockPix + webhook idempotente) | ✅ |
| 6 | Conectar front/admin + extras (gateway real, e-mail, ranking) | ⏳ planejado |

**Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL + Zod + JWT/bcrypt + AES-256-GCM.
**Banco de validação:** Supabase cloud (projeto `mealfy-staging`, PostgreSQL 17).
**Branch:** `redesign/ui-ux-apple` (PR #1).

---

## Fase 0 — Auditoria & documentação
**Objetivo:** auditar os mocks, definir o backend necessário e o plano, sem codar antes de documentar.
- Auditoria dos ~20 mocks (arquivo, risco, prioridade, migração).
- Modelo de banco (14 tabelas / 13 enums), endpoints, fluxos Pix/gift card, LGPD, deploy.
- `COMO-FUNCIONA.md` (linguagem simples).

**Commits:** `e320ddf`, `b982d39`.

---

## Fase 1 — Fundação da API
**Objetivo:** backend isolado em `/backend`, independente do app mobile, pronto para Railway/Render.

| Sub | Entrega | Commit |
|---|---|---|
| 1A | Express + TS + `/health` + env (Zod); remove o scaffold mock antigo | `513d2e4` |
| 1B | Prisma + PostgreSQL (client singleton + status no `/health`) | `db6c542` |
| 1C | Schema inicial (14 tabelas, 13 enums) + migration inicial | `870594d` |
| 1D | Seed idempotente (admin/entidade/doador, famílias SP/RJ, gift cards) | `5ee493f` |
| 1E | Deploy Railway/Render (build/start/Dockerfile) | `5c3f9f0` |
| 1F | README de setup/deploy | `140b986` |
| 1G | **Validação em PostgreSQL real** (local): migrate + seed + `/health: connected` | `9933dc6` |

---

## Fase 2 — Auth, usuários, entidades, famílias
**Objetivo:** autenticação e o domínio de famílias com aprovação manual e segurança por papel.

| Sub | Entrega | Commit |
|---|---|---|
| 2A | Auth: register/login, bcrypt, JWT, `authGuard`/`roleGuard`, `GET /me` | `0fa17c8` |
| 2B | `PATCH /me` (DTO sem hash) | `1e53d55` |
| 2C | Entidades: dashboard + CRUD de famílias com escopo + audit | `4f2186c` |
| 2D | Famílias: aprovação (regra **0–17**), mapa/ficha **sem PII** | `8c450f1` |
| 2E | Provider diário (`request-daily-support`) | `c847c76` |
| 2F | Audit logs (`GET /admin/audit-logs`) + approve/block de entidade | `2ce9d91` |
| 2G | Docs das rotas da Fase 2 | `6c54448` |
| 2H | **Validação no Supabase cloud**: schema+seed (MCP) e API ao vivo (`/health connected`, smoke HTTP) | `6d5e556`, `224814e` |

**Regras-chave:** backend é fonte de verdade; família sem dependente 0–17 não é aprovada;
entidade só gerencia as suas famílias; doador/mapa nunca recebem CPF/NIS/endereço.

---

## Fase 3 — Gift cards reais
**Objetivo:** importação manual pelo admin, criptografia, estoque seguro e reserva transacional.

| Sub | Entrega | Commit |
|---|---|---|
| 3A | Baseline da migration no Supabase (`_prisma_migrations`) + `ENCRYPTION_KEY` | `ccdc7d3` |
| 3B | Crypto service **AES-256-GCM** (encrypt/decrypt/hash/mask) | `8c78a3d` |
| 3C | `POST /admin/gift-cards/import` (dedupe via `codeHash`, cifra, transacional) | `78911b9` |
| 3D | Estoque + listagem mascarada + lotes | `a59c6da` |
| 3E | `POST /admin/gift-cards/:id/invalidate` | `a448ab5` |
| 3F | Reserva/liberação transacional (`FOR UPDATE SKIP LOCKED`) | `05f3cb9` |
| 3G | Docs de gift cards | `03bc155` |

**Regras-chave:** código nunca em claro/log; `codeEncrypted`/`codeHash` nunca em resposta;
duplicado não importa; usado/invalidado nunca volta a `available`.

---

## Fase 4 — Doações
**Objetivo:** doação com máquina de estados, 1 ajuda/família/dia, liberação após confirmação e código para o beneficiário.

| Sub | Entrega | Commit |
|---|---|---|
| 4A | Máquina de estados + service + DTOs (sem código) | `d75a63f` |
| 4B | Bloqueio diário (reset **08h America/Sao_Paulo**) | `e22effb` |
| 4C | `POST /donations` (doador) | `4f8db19` |
| 4D | `confirm-payment-mock` (libera vale, alimenta família) — atômico | `298a19e` |
| 4E | Vínculo beneficiário (migration) + `GET /beneficiary/gift-cards` (vê o código) | `e2972c0` |
| 4F | Histórico do doador + "alimentada por" | `e2c6826` |
| 4G | `POST /donations/:id/cancel` | `f9ae9a5` |
| 4H | Docs | `833f911` |

**Regras-chave:** vale **só após confirmação**; doador nunca vê o código; beneficiário vê;
sem dupla doação no dia; `completed` sempre com vale `used`.

---

## Fase 5 — Pagamentos Pix (MockPix)
**Objetivo:** camada de pagamento abstrata com Pix mockado e webhook idempotente. Gateway real fica para depois.

| Sub | Entrega | Commit |
|---|---|---|
| 5A | `PaymentProvider` abstrato + **MockPix** + env | `742f8a1` |
| 5B | Cobrança Pix na doação + `finalizeDonationAfterPayment` compartilhado | `02cb353` |
| 5C/5D | **Webhook idempotente assinado** (HMAC) + `simulate-paid` + `GET /payments/:id` | `d383648` |
| 5E | Expiração de cobrança | `18d0497` |
| 5F | Docs | `3eb7011` |

**Regras-chave:** vale só após `paid`; webhook idempotente (`PaymentEvent.externalEventId` único)
e assinado (assinatura inválida → 401); cobrança expirada não paga; trocar gateway = novo `RealPixProvider`.

---

## Fase 6 — Conectar front/admin + extras (planejado)
- App mobile e painel admin consumindo a API real (substituir mocks/localStorage com fallback controlado).
- **Gateway Pix real** (`RealPixProvider`) quando escolhido.
- E-mail real (credenciais de entidade/notificações).
- Favoritos, ranking/badges derivados de doações reais, recorrência (lembrete, sem débito automático).

---

## Pendências / riscos abertos
- **Migrations no Supabase** exigem session pooler (porta 5432) via `DIRECT_URL` + `directUrl` no datasource
  (o transaction pooler/pgbouncer atual serve o runtime, não `migrate`).
- **Gateway de pagamento Pix** ainda não escolhido (Mercado Pago/Asaas/Efí/Pagar.me…).
- **Hospedagem** definitiva (Railway/Render/Supabase) e provedor de e-mail a confirmar.
- 🔴 Rotacionar a chave `sb_secret_…` exposta no chat em turnos anteriores.
- Gov.br/CadÚnico/NIS permanecem **mock declarado** (sem convênio/base legal).
