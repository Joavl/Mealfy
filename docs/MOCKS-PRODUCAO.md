# Mealfy — Inventário de Mocks (para handoff de Produção)

> Atualizado em 22/06/2026. Objetivo: listar **tudo que é mockado/simulado** hoje e o que
> precisa virar real antes de produção. O app roda 100% no front (React + Vite + Capacitor),
> sem backend implantado.

---

## 0. Arquitetura atual (importante)

O app é **"API-first com fallback para mock"**:

- `src/api/apiClient.ts` faz `fetch` para `VITE_API_URL` (padrão `http://localhost:3000`).
- Cada serviço em `src/backend/services/*` **tenta a API primeiro**; se a chamada falhar
  (não há backend), cai no **fallback mock + localStorage** (`src/backend/utils/fallback.ts`,
  logs `[FALLBACK MODE]`).
- Hoje, como **não há backend implantado**, praticamente **todos os dados vêm do mock/localStorage**.

➡️ Para produção: subir o backend nos endpoints abaixo e definir `VITE_API_URL`. O front já está
preparado para consumir a API; o mock serve de contrato/spec.

---

## 1. Autenticação (MOCK PURO — sem OAuth/sem backend de auth)

| Item | Onde | Situação | Para produção |
|---|---|---|---|
| Login Google | `components/ui/GoogleMockModal.tsx` | Modal visual que "escolhe" um usuário mock | OAuth Google real |
| Login Meta/Facebook | `pages/Auth.tsx` (`handleMetaClick`) | Só spinner + toast de sucesso | OAuth Meta real |
| Login/verificação Gov.br | `components/ui/GovBrMockModal.tsx` | Preenche nome/nascimento fixos; selo "verificado" | Integração Gov.br (gov.br OAuth) real |
| Senha | `backend/mockData/users.ts` (`MOCK_PASSWORD = '123456'`) | Senha única para todas as contas demo | Hash + auth real (nunca senha em claro) |
| Credenciais/sessão | `authProvider.ts` (`current_user`, `registered_users`, `mock_credentials` no localStorage) | Sessão e cadastro só no navegador | JWT/sessão no backend |
| Cadastro (Register Typeform) | `authService.registerUser` | Grava usuário no localStorage | POST /auth/register real |

---

## 2. Vale-alimentação / gift cards (MOCK PURO — decisão de modelo de negócio)

| Item | Onde | Situação | Para produção |
|---|---|---|---|
| Banco de códigos | `backend/mockData/giftCardInventory.ts` | Estoque fictício de códigos (ifood/99/carrefour) | Integração/compra real de vale-presente |
| Liberação de código | `backend/services/giftCardService.ts` (`releaseCode`) | Marca código `used` no localStorage | API transacional + idempotência |
| Integração iFood/99/Carrefour | — | **Não existe**; código é fictício | APIs reais dos parceiros |
| Escolha do parceiro | `GiftCardSelectorModal.tsx` + `family.preferredGiftCardProvider` | Mock | Persistir no backend |

---

## 3. Validação de beneficiário (MOCK PURO)

| Item | Onde | Situação | Para produção |
|---|---|---|---|
| Consulta NIS/CadÚnico | `pages/RegisterFamily.tsx` (`verifyNis`) | Stub: sempre "localizado" após 1,2s; **não consulta nada** | Integração CadÚnico/Bolsa Família/Gov |
| Regra "≥1 dependente 0–17" | `RegisterFamily.tsx` | Validada no front (form) | Validar também no backend |
| Aprovação de família | `families_db` (`approvalStatus`) | Manual via painel mock | Workflow real de moderação |
| Origem do dado (gov/manual) | campo `dataSource` | Flag mock | Vincular à fonte real |

---

## 4. Painel Admin (MOCK PURO — localStorage)

| Item | Onde | Situação | Para produção |
|---|---|---|---|
| Dados do admin | `hooks/useAdminData.ts` | 100% localStorage (seed próprio) | API admin real |
| Edição dos Stories (Top 20) | `AppContext` (`stories`, chave `stories_v1`) | localStorage | Endpoint de destaques |
| Moderação entidades/famílias/usuários | `useAdminData` | localStorage | API + RBAC real |
| ⚠️ `hooks/useAdminDashboard.ts` (Supabase) | importa `lib/supabase` | **Órfão/não usado** | Decidir: usar Supabase ou remover |

---

## 5. Outras simulações (MOCK PURO)

| Item | Onde | Situação |
|---|---|---|
| Pagamento da doação | `DonationChoice.tsx` | **Não há gateway**; "doar" só libera código do estoque mock |
| E-mail de credenciais à entidade | `entity_email_log` (localStorage) | Só registra evento visual; **não envia e-mail** |
| Conectar Instagram/Meta (perfil) | `Profile.tsx` / `Home.tsx` | Grava string `user.instagram`; sem OAuth |
| Compartilhar (WhatsApp/IG/e-mail) | `Home.tsx`, `Success.tsx`, `Profile.tsx` | Toasts simulados; **QR Code é decorativo** (SVG fixo) |
| Recorrência ("apoiar novamente") | `DonationChoice.tsx` | Hoje é só intenção/checkbox; **não há lembrete/agendamento real** |
| Latência de rede | `backend/utils/delay.ts` (`randomDelay`) | Atrasos artificiais para parecer real |
| Ranking | `backend/services/rankingService.ts` | Ordena dados mock por `totalDonated` |

---

## 6. Dados-semente (mockData/) carregados no localStorage

- `users.ts` — 3 contas demo (doador, entidade, beneficiário) + 1 admin; senha `123456`.
- `families.ts` — **23 famílias** fictícias (12 SP + 11 RJ), localização aproximada.
- `communities.ts` — comunidades base.
- `donations.ts` — doações/gift cards históricos.
- `giftCardInventory.ts` — estoque de códigos.

**Chaves de localStorage** (prefixo `mealfy_`): `current_user`, `users_db`, `registered_users`,
`mock_credentials`, `families_db`, `families_seed_version`, `donor_indications_db`, `entities_db`,
`communities_db`, `donations_db`, `giftcards_db`, `giftcard_inventory_v1`, `recurrences_db`,
`stories_v1`, `entity_email_log`.

---

## 7. O que JÁ é real (não-mock)

- **Geolocalização** — `@capacitor/geolocation` (permissão e GPS reais no Android/iOS).
- **Mapa** — Leaflet + tiles OpenStreetMap/Carto (reais).
- **Build/empacotamento** — Vite + Capacitor (APK Android real via CI).
- **UI/navegação/regras client-side** — reais (não mock), só sem persistência de servidor.

---

## 8. Regras de negócio hoje só no client (mover/duplicar no backend)

- Limite de **1 doação/família/dia** (`backend/utils/timeUtils.ts`, reset 08h).
- Elegibilidade **0–17 anos** no cadastro (`RegisterFamily.tsx`).
- Unicidade/sem-reuso de código de vale (`giftCardService.ts`).
- Aprovação de família, ranking, favoritos (`savedFamilyIds` no `current_user`).

> Regras no front são burláveis. Em produção precisam ser **autoritativas no backend**.

---

## 9. Checklist mínimo para produção

- [ ] Subir backend e definir `VITE_API_URL` (endpoints: `/auth/*`, `/families/*`, `/donations/*`, `/giftcards/*`, `/indications/*`, `/communities/*`, `/regions/*`, `/ranking/*`, `/admin/*`, `/users/*`).
- [ ] OAuth real: Google, Meta, Gov.br.
- [ ] Gateway de pagamento + integração real de vale (iFood/99/Carrefour) com estoque/transação.
- [ ] Consulta real ao NIS/CadÚnico.
- [ ] Envio real de e-mail (credenciais/notificações).
- [ ] Mover regras críticas (limite diário, elegibilidade, unicidade de código, aprovação) para o backend.
- [ ] QR Code/deep link/redirect de loja reais no compartilhamento.
- [ ] Decidir sobre Supabase (`useAdminDashboard`) — usar ou remover.
- [ ] Remover `MOCK_PASSWORD`, contas demo e seeds antes do go-live.
- [ ] Recorrência real (lembrete/agendamento) se for manter a feature.
