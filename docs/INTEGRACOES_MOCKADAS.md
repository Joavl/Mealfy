# Integrações Visuais Mockadas — Meta, Gov.br e Gift Card

> **Status:** Representação visual / protótipo de UX.
> **Data:** 14/06/2026
> **Escopo:** Login social (Meta), login + verificação de identidade (Gov.br) e seleção de
> parceiro de vale-alimentação (gift card).

---

## ⚠️ Aviso importante — tudo é simulado

**Nenhuma destas funcionalidades faz chamadas de rede reais.** Não há SDK da Meta, não há
integração com o `gov.br` (OAuth/OIDC do governo) e não há API de parceiros de gift card
(iFood, Carrefour, 99). Todo o comportamento é simulado no front-end:

- Os "loadings" são `setTimeout` de ~1,2 s para imitar latência de rede.
- Os dados do Gov.br (nome, data de nascimento, CPF) são **valores fixos hardcoded** com
  finalidade de demonstração — o CPF é parcialmente mascarado e fictício.
- A escolha do gift card é persistida apenas em `localStorage` no dispositivo do usuário.
- Os selos de verificação ("Verificado via Gov.br" / "Identidade pendente") são **estados
  visuais fixos/alternados**, sem lógica de verificação por trás.

Quando estas integrações forem implementadas de verdade, os pontos de troca estão isolados
nos handlers descritos abaixo (`handleMetaClick`, `handleGovClick`, `handleGiftCardConfirm`),
o que facilita substituir o mock pela chamada real.

---

## Design system aplicado — "Liquid Glass"

Todos os componentes seguem o padrão já estabelecido no app:

| Princípio | Aplicação |
|-----------|-----------|
| **Bordas retas** | `--radius-md` (2px) / `--radius-lg` (4px) — sem cantos arredondados exagerados. |
| **Glassmorphism** | Reaproveita o painel `.auth-form-panel` (`backdrop-filter: blur(22px)`). Modais usam bottom-sheet branco sobre overlay escurecido. |
| **Tipografia** | `Plus Jakarta Sans` via `--font-family-body` / `--font-family-heading`. |
| **Tokens de cor** | `--color-primary` (#00365f), `--color-success`, `--color-secondary`. Cores de marca (Meta #1877F2, Gov.br #1351B4/#FFCD07) são usadas **apenas** nos elementos de cada integração, para reforçar reconhecimento visual. |
| **Feedback** | Spinners reaproveitam `.auth-spinner`; mensagens de sucesso usam o `ToastContext` existente (`showToast`). |

### Boas práticas de UX/acessibilidade adotadas

- **Estados de loading bloqueantes**: botões ficam `disabled` + `aria-busy="true"` durante a
  simulação, evitando duplo-clique.
- **`role="dialog"` + `aria-modal="true"`** nos bottom-sheets; fechamento por clique no overlay.
- **Hierarquia clara de ação**: ação primária (azul preenchido) vs. cancelar (contornado).
- **Confirmação explícita** antes de aplicar a verificação Gov.br (resumo dos dados antes do
  "Confirmar e continuar") — princípio de transparência sobre dados pessoais.
- **Reversibilidade**: a escolha do gift card pode ser trocada a qualquer momento
  ("Alterar vale-alimentação").

---

## 1. Login social — Meta + Gov.br

### Onde foi posicionado e por quê

**Decisão: os botões ficam na tela de Auth (`Auth.tsx`), na seção social existente
("ou continue com"), logo abaixo do botão do Google — NÃO dentro do fluxo Typeform de
cadastro.**

Justificativa:

1. **Consistência de padrão.** A tela de Auth já possui uma área dedicada a login social
   (separador "ou continue com" + botão Google com mock). Adicionar Meta e Gov.br ali agrupa
   todas as alternativas de autenticação no mesmo lugar — é onde o usuário já espera encontrá-las.
2. **Não quebra o fluxo Typeform.** O cadastro foi reconstruído como um fluxo Typeform
   (uma pergunta por tela, com transições `framer-motion` cuidadosamente ajustadas). Injetar
   um passo de "login social" no meio desse fluxo exigiria um novo tipo de passo por papel
   (doador/entidade/beneficiário) e arriscaria regressões no fluxo recém-validado.
3. **Semântica correta.** Login social é um atalho de **autenticação/entrada**, não um passo
   de **coleta de cadastro**. O lugar natural é a tela de login.
4. **Caminho de evolução.** Numa implementação real, o login Gov.br retornaria dados verificados
   (nome, nascimento, CPF) que poderiam então **pré-preencher** o Typeform. Esse encaixe fica
   documentado como evolução futura, mas hoje o ponto de entrada continua sendo a Auth.

### Comportamento (mock)

**Continuar com Meta** (`.auth-btn-meta`)
1. Clique → spinner por ~1,2 s (botão `disabled`).
2. Toast de sucesso: **"Login via Meta realizado com sucesso"**.

**Entrar com Gov.br** (`.auth-btn-govbr`)
1. Clique → spinner por ~1,2 s (botão `disabled`).
2. Abre o bottom-sheet `GovBrMockModal` com o resumo dos dados "preenchidos automaticamente":
   - Nome completo: `Maria da Silva Santos`
   - Data de nascimento: `14/03/1990`
   - CPF: `123.***.***-09` (mascarado/fictício)
3. Usuário clica em **"Confirmar e continuar"** → toast: **"Identidade verificada via Gov.br"**.

### Arquivos

| Arquivo | Papel |
|---------|-------|
| `src/pages/Auth.tsx` | Botões Meta/Gov.br, estados `isMetaLoading`/`isGovLoading`, handlers `handleMetaClick`/`handleGovClick`/`handleGovConfirm`, dados mock `mockGovData`. |
| `src/pages/Auth.css` | Classes `.auth-btn-meta`, `.auth-btn-govbr`, `.govbr-icon`. |
| `src/components/ui/GovBrMockModal.tsx` | Bottom-sheet com resumo dos dados verificados. |
| `src/components/ui/GovBrMockModal.css` | Estilos (reaproveita base do `GoogleMockModal.css`). |

---

## 2. Seleção de gift card (beneficiário)

### Onde foi posicionado e por quê

Integrado ao **BeneficiaryDashboard**, no estado "Aprovado", junto ao card do vale-refeição.
O beneficiário escolhe/troca o parceiro a partir do link **"Alterar vale-alimentação"** ao
lado do título "Vale-Refeição Liberado". A escolha atualiza imediatamente o voucher exibido
(logo do parceiro + prefixo do código).

Optou-se por colocar a seleção como **modal acionável a partir do voucher** (em vez de uma
tela bloqueante pós-aprovação) para que: (a) a troca seja sempre reversível; (b) o usuário veja
o impacto da escolha no mesmo contexto onde resgata o benefício.

### Parceiros disponíveis (mock)

| Parceiro | Cor | Descrição |
|----------|-----|-----------|
| iFood | #EA1D2C | Resgate em qualquer loja iFood Mercado. |
| Carrefour | #1E4DA1 | Use em qualquer unidade Carrefour ou Carrefour Express. |
| 99Food | #FFCC00 | Pague com saldo 99Pay em restaurantes e mercados parceiros. |

> Os "logos" são representações tipográficas (sigla sobre cor da marca), evitando uso de
> assets de marca registrados nesta fase de protótipo.

### Comportamento (mock)

1. Estado de seleção visual claro: borda destacada + check no card escolhido.
2. **"Confirmar escolha"** → persiste em `localStorage` (`mealfy_giftcard_<userId>`),
   atualiza o voucher e dispara toast: **"Vale-alimentação atualizado para <parceiro>!"**.
3. O voucher passa a exibir a logo do parceiro e o código com prefixo correspondente
   (`IFOD-`, `CRFU-`, `99FD-`).

### Arquivos

| Arquivo | Papel |
|---------|-------|
| `src/components/ui/GiftCardSelectorModal.tsx` | Modal de seleção + constante `GIFT_CARD_PARTNERS`. |
| `src/components/ui/GiftCardSelectorModal.css` | Estilos dos cards selecionáveis. |
| `src/pages/BeneficiaryDashboard.tsx` | Estado `giftCardProvider` (persistido), handler `handleGiftCardConfirm`, voucher dinâmico, link "Alterar vale-alimentação". |
| `src/pages/BeneficiaryDashboard.css` | `.giftcard-partner-logo`, `.giftcard-change-link`. |

---

## 3. Selos de verificação (dashboards)

### BeneficiaryDashboard
Badge no cabeçalho do painel, refletindo o status de verificação do beneficiário:
- **"Verificado via Gov.br"** — verde, ícone `ShieldCheck` (`--color-success`).
- **"Identidade pendente"** — amarelo, ícone `ShieldAlert` (`--color-secondary`).

Estado inicial mockado = `Identidade pendente` (constante `isGovVerified = false`, ponto único
de troca para a implementação real).

### EntityDashboard
Cada família na lista "Famílias Cadastradas" exibe um indicador de verificação Gov.br,
**alternando** entre verificado/pendente (`idx % 2`) para demonstrar ambos os estados.
Convive com os selos já existentes (CadÚnico / Manual) e com a pílula de status
(Alimentada / Aguardando).

### Arquivos

| Arquivo | Papel |
|---------|-------|
| `src/pages/BeneficiaryDashboard.tsx` + `.css` | `.badge-verification--ok` / `.badge-verification--pending`. |
| `src/pages/EntityDashboard.tsx` + `.css` | `.badge-govbr` / `.badge-pending` por família. |

---

## Verificação realizada

- ✅ `npx tsc --noEmit` sem erros.
- ✅ Preview (mobile 375×812) — fluxo Meta: loading → toast de sucesso.
- ✅ Preview — fluxo Gov.br: loading → modal com dados → toast de verificação.
- ✅ Preview — seleção de gift card: troca iFood → Carrefour reflete no voucher.
- ✅ Preview — selos: "Identidade pendente" no BeneficiaryDashboard; alternância
  verificado/pendente por família no EntityDashboard.

## Pontos de troca para implementação real (futuro)

| Mock atual | Substituir por |
|------------|----------------|
| `handleMetaClick` (`setTimeout` + toast) | Meta Login SDK / OAuth da Meta. |
| `handleGovClick` + `mockGovData` | Fluxo OIDC `gov.br` → dados verificados reais. |
| `isGovVerified` (constante) | Status real de verificação vindo do backend. |
| `handleGiftCardConfirm` (`localStorage`) | Endpoint de provisão/troca de gift card no backend. |
| `GIFT_CARD_PARTNERS` (cor + sigla) | Catálogo real de parceiros + assets oficiais. |
