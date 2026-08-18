# Mealfy — Análise de Prontidão para Produção (Go-Live)

> Análise completa do que falta para colocar o Mealfy em produção. Atualizado em **25/06/2026**.
> Prioridades: **P0** = bloqueador (não sobe sem) · **P1** = logo após go-live · **P2** = melhoria.
> Relacionados: [`FASES.md`](./FASES.md), [`BACKEND_AUDIT_AND_IMPLEMENTATION_PLAN.md`](./BACKEND_AUDIT_AND_IMPLEMENTATION_PLAN.md), [`MOCKS-PRODUCAO.md`](./MOCKS-PRODUCAO.md).

---

## 1. Onde estamos hoje

**Backend (`/backend`)** — MVP funcional e validado no **Supabase cloud** (staging):
- Auth (JWT/bcrypt), usuários, entidades, famílias + aprovação, audit logs (Fase 2).
- Gift cards reais: cripto AES-256-GCM, importação, estoque, invalidação, reserva transacional (Fase 3).
- Doações: máquina de estados, bloqueio 1/família/dia, liberação de vale, beneficiário vê código (Fase 4).
- Pagamentos: **MockPix** + webhook idempotente assinado (Fase 5).
- Em evolução: **gift card orders + fulfillment assíncrono** (estados `gift_card_purchase_pending`/`manual_review`), abstração de **gift card provider** (só `manual_inventory` implementado), **ranking**, privacidade do perfil, validação de dígito do **NIS**.

**App mobile (React/Vite/Capacitor)** — **parcialmente conectado**: auth e famílias/mapa já batem na API real (`feat(app): connect auth/families to backend`); doações, Pix, beneficiário, admin e ranking ainda dependem da camada de fallback (localStorage).

**Produção:** ❌ não está no ar. Só há `Dockerfile` + docs de deploy. Sem CI de backend, sem testes automatizados, sem hospedagem provisionada.

---

## 2. P0 — Bloqueadores (não vai para produção sem)

### 2.1 Negócio / contratos (dependem de decisão do cliente)
| Item | Por quê |
|---|---|
| **Gateway Pix real** | Escolher provedor (Mercado Pago / Asaas / Efí / Pagar.me), contrato, **conta PJ recebedora**, homologação e implementar `RealPixProvider`. Sem isso não há dinheiro real. |
| **Fornecimento de gift card real** | Hoje só `manual_inventory` (operação compra e importa à mão). Definir fornecedor/API (iFood/99/Carrefour direto ou reseller ex. Incomm) + SLA de reposição. Os providers `todo_incomm/incentive_me/ding_connect/ifood_card` são **stubs**. |
| **Pessoa jurídica + fiscal** | CNPJ da Mealfy, natureza da "doação", repasse e tributação — definir com contador/advogado. |
| **LGPD / base legal** | Política de privacidade, termos de uso, **base legal para dados de crianças/beneficiários vulneráveis** (LGPD art. 14), consentimento, encarregado (DPO), retenção, direito de exclusão/exportação. **Risco legal alto.** |

### 2.2 Técnico (posso implementar)
| Item | Situação | Ação |
|---|---|---|
| **Deploy real** | só Dockerfile | Subir API (Railway/Render) + **Postgres de produção separado do staging** (Supabase prod), migrations via `DIRECT_URL` (session pooler), `.env` de produção. |
| **Segurança HTTP** | falta `helmet`, **rate limiting**, CORS travado | Adicionar helmet + rate-limit (login e `/payments/webhook`), CORS só nas origens reais, forçar HTTPS. |
| **Gestão de segredos** | `sb_secret` exposta; `ENCRYPTION_KEY` sem backup | **Rotacionar** a chave secreta exposta; **backup seguro + plano de rotação da `ENCRYPTION_KEY`** (perdê-la = perder TODOS os códigos cifrados); segredos fora do repo (secret manager do provedor). |
| **Auth hardening** | access longo, sem reset real | Refresh token + access curto, **reset de senha por e-mail**, lockout/rate-limit no login, **remover contas demo + `MOCK_PASSWORD` + seed** de produção. |
| **E-mail real** | mock | Provedor (Resend/SES/SendGrid): credenciais de entidade, notificação de vale liberado, reset de senha. |
| **Testes automatizados** | só smoke manual | Suíte (Vitest/Jest) das **regras críticas**: vale só após pagamento, 1/dia, idempotência do webhook, não-reuso de código, elegibilidade 0–17, doador não vê código. |
| **CI/CD backend** | só CI de APK | Pipeline: typecheck + build + testes → `migrate deploy` → deploy. Hoje `.github/workflows` só tem android/ios. |
| **Observabilidade** | só `console` | Logging estruturado (pino) + request-id, **error tracking (Sentry)**, uptime/health, **alertas** (estoque baixo por provider, webhook falhando, taxa de erro). |
| **Front ↔ backend completo (Fase 6)** | parcial | Conectar doações/Pix/beneficiário/admin/ranking; remover fallback localStorage; **fluxo de pagamento Pix real na UI**; tratamento de erro/offline. |

---

## 3. P1 — Importante (logo após o go-live)
- **Backups automatizados** do Postgres + teste de restore documentado.
- **Cron de expiração de Pix** (hoje é endpoint manual `/payments/expire-overdue`).
- **Painel admin conectado** de fato (importar gift cards, estoque, pagamentos, auditoria) — validar ponta a ponta.
- **Fulfillment assíncrono robusto** quando o provider real entrar: retry/idempotência, `manual_review` operacional, reconciliação.
- **Migrations em produção**: adicionar `directUrl = env("DIRECT_URL")` ao datasource + rodar via session pooler.
- **Publicação nas lojas**: Android (APK via CI ✅) · **iOS precisa de conta Apple** (pendência conhecida).
- **Confirmar bloqueio de rotas dev** em produção (`simulate-paid`, `confirm-payment-mock` já checam `NODE_ENV`, revisar).
- **Rate limit / anti-abuso** por usuário/IP em doações.

---

## 4. P2 — Melhorias
- Code-splitting no front (bundle > 500 kB gera warning).
- CDN/cache de assets; feature flags; analytics de produto.
- Runbook de operação (incidentes, reposição de estoque, chargeback/reembolso).
- i18n (pt-BR ok hoje) e acessibilidade (auditoria).

---

## 5. Riscos altos específicos
1. **Dados de menores (LGPD art. 14)** — tratamento de dados de crianças exige consentimento específico e cuidado redobrado. Risco jurídico/reputacional alto.
2. **`ENCRYPTION_KEY` única** — sem backup/rotação, um incidente perde todos os códigos de gift card. Crítico.
3. **Furo de estoque** — doador paga e família fica sem vale. Há checagem de estoque na criação; validar o caminho **assíncrono** (compra sob demanda) para não completar doação sem entregar.
4. **Fluxo financeiro** — quem recebe o Pix, como repassa e as obrigações fiscais/contábeis.
5. **Webhook do gateway real** — cada provedor tem seu formato/assinatura; adaptar o `verifyAndParseWebhook` e testar idempotência com eventos reais.

---

## 6. Sequência sugerida até o go-live
1. **Fase 6** — conectar todo o app à API (doações/Pix/beneficiário/admin/ranking), remover fallback.
2. **Gift card real** — escolher fornecimento; se demorar, operar com `manual_inventory` + processo interno (viável para piloto).
3. **Gateway Pix real** — contratar, `RealPixProvider`, homologar.
4. **Endurecimento** — segurança (helmet/rate-limit/segredos), observabilidade, testes + CI backend.
5. **Deploy prod** — API + Postgres prod + migrations + backups + monitoração.
6. **Legal/LGPD** — políticas, base legal, DPO, termos.
7. **Piloto controlado** — 1 entidade + poucas famílias, dinheiro real em baixa escala.
8. **Go-live gradual** + publicação nas lojas.

---

## 7. Checklist objetivo

**P0 técnico:** [ ] deploy API+DB prod · [ ] helmet+rate-limit+CORS · [ ] rotacionar segredo + backup `ENCRYPTION_KEY` · [ ] refresh token + reset senha + remover seed/demo · [ ] e-mail real · [ ] testes automatizados + CI backend · [ ] logging/Sentry/alertas · [ ] front 100% conectado.
**P0 negócio:** [ ] gateway Pix + conta PJ · [ ] fornecimento de gift card · [ ] fiscal/contábil · [ ] LGPD (políticas, base legal, DPO).
**P1:** [ ] backups+restore · [ ] cron expiração · [ ] admin conectado · [ ] fulfillment async robusto · [ ] `directUrl` migrations · [ ] lojas (iOS conta Apple).

> **Resumo:** o **núcleo de backend está pronto e validado**; o que falta é **operacionalizar** (deploy, segurança, observabilidade, testes/CI), **integrar o front por completo**, e destravar as **decisões de negócio** (Pix real, fornecimento de gift card, LGPD). Nenhum bloqueador é técnico-impossível — é execução + contratos.
