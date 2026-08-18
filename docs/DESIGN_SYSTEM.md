# Mealfy — Design System & Redesign UI/UX

> **Atualizado:** 15/06/2026
> **Direção:** acabamento premium, contemporâneo e discreto (cantos suaves estilo Apple),
> preservando a identidade da marca (navy `#00365f` + dourado `#c7a754`, Plus Jakarta Sans).
> **Modo:** apenas claro nesta rodada; tokens semânticos já preparados para modo escuro.

---

## 1. Princípios

- **Clareza acima de decoração.** Cada tela tem uma intenção principal evidente.
- **Profundidade funcional.** Elevação e desfoque só onde ajudam hierarquia/contexto (navegação, overlays).
- **Consistência por tokens.** Cor, tipografia, espaçamento, raio, sombra e movimento vêm de um único lugar (`src/index.css`).
- **Resposta imediata.** Todo controle tem estados hover/active/focus/disabled e foco visível por teclado.
- **Movimento com propósito** e respeito a `prefers-reduced-motion`.

## 2. Tokens (`src/index.css`)

### Cor (semântica, theme-aware)
`--color-background`, `--color-surface`, `--color-surface-2`, `--color-surface-highest`,
`--color-text-main`, `--color-text-secondary`, `--color-text-tertiary`, `--color-text-inverted`,
`--color-border`, `--color-primary`(+container/-rgb), `--color-secondary`(+container/-rgb),
`--color-success`/`--color-warning`/`--color-error` (+ `-rgb`), `--color-focus-ring`.
Bloco `[data-theme="dark"]` já define as variantes escuras (não ativado).

### Tipografia
Escala: `--text-display` 32 · `--text-title` 24 · `--text-section` 19 · `--text-card-title` 16 ·
`--text-body` 15 · `--text-body-sm` 13 · `--text-caption` 12 · `--text-label` 11.
Pesos: `--weight-regular…extrabold`. Fonte única: Plus Jakarta Sans.

### Raio (cantos suaves)
`--radius-sm` 8 · `--radius-md` 12 (controles) · `--radius-lg` 16 (cards) · `--radius-xl` 22 (modais/sheets) · `--radius-full`.
Aliases semânticos: `--radius-control`, `--radius-card`, `--radius-modal`, `--radius-pill`.

### Espaçamento, elevação, movimento, layout
Spacing base 4px (`--spacing-1…8`). Elevação `--shadow-sm…xl` / `--elevation-1…3` (neutras, suaves).
Movimento `--motion-fast/base/slow` + `--ease-standard/out/in`.
Layout `--layout-max-width` 480 · `--gutter` 20 · `--header-height` 56 · `--tabbar-height` 64 · `--tabbar-clearance`.

## 3. Base e acessibilidade

- `:focus-visible` global com `--focus-ring` (foco só para teclado).
- `@media (prefers-reduced-motion: reduce)` neutraliza animações/transições.
- App centralizado em coluna de 480px com moldura sutil em telas grandes (`.app-wrapper`).
- Alvos de toque ≥ 44px nos controles principais.

## 4. Camada de utilitários (`src/App.css`)

O projeto usa **classes no estilo Tailwind sem Tailwind instalado**. Muitas eram inertes,
causando bugs silenciosos. Foi adicionada uma camada única de utilitários mapeada aos tokens.
Cobertura: display (`block`, `hidden`, `inline-flex`…), posição (`relative/absolute/fixed/sticky`,
`inset-0`, `z-[1000/9999/10000]`), espaçamento (`m*/p*/gap*`), tipografia (`text-[9/10/11px]`,
`text-xs…2xl`, `uppercase`, `text-left/right`), cor de fundo/borda token-mapeada
(`bg-surface/primary/...` + variantes de opacidade `bg-*/10`, `border-outline/10`…) e overlay
(`bg-black/40-60`).

**Bugs reais corrigidos por essa camada:** textos colados ("Lucas7 anos", resumo da doação),
itens de FAQ desalinhados, e o **modal de Medalhas do Perfil** que não cobria a tela
(`fixed inset-0 z-[10000] bg-black/60` estavam todos inertes).

> **Dívida técnica conhecida:** cada página define seus próprios utilitários globalmente,
> o que causou colisões de nome (ex.: `.stats-grid` da `EntityDashboard` sobrescrevia a da
> `Home`). Onde houve impacto visual, os seletores foram escopados sob a raiz da página
> (ex.: `.home-page .stats-grid`). Consolidar todos os utilitários em um único arquivo é
> recomendado como evolução.

## 5. Componentes globais redesenhados

- **Button** — flat (sem gradiente/gloss), raio de controle, estados completos, spinner CSS (substitui emoji ⏳), `aria-busy`, foco visível.
- **AppHeader** — header translúcido com blur, hairline inferior, título com a escala tipográfica.
- **BottomTabBar** — alinhada à coluna do app (não cobre conteúdo), pill ativa com tint da marca, foco visível.
- **Toast / Modal / BottomSheet** — superfície branca, raios suaves, scrim consistente, sheets limitados à largura do app, foco visível.

## 6. Correções de acabamento notáveis

- Fonte ausente (`Manrope`/`Inter` nunca importadas) → todas migradas para a fonte do design system.
- Home: grade de estatísticas 2+1 → 3 colunas equilibradas; "patrocinadores" como texto solto → bloco "Parceiros de tecnologia".
- Profile: chip de Instagram com `@@` duplicado → corrigido.
- `.status-card`: gradiente dourado com texto branco (falha de contraste) → gradiente navy (AA).
- Tokens indefinidos referenciados no CSS (`--color-surface`, `--color-primary-rgb`, `--color-outline-low`) → definidos.

## 7. Pendências

- `AdminDashboard.tsx` está órfão (rota removida) — sinalizado para remoção separada.
- Validação visual individual pendente em algumas rotas secundárias (ver checklist na entrega).
- Code-splitting do bundle (>500 kB) — fora do escopo de UI.
