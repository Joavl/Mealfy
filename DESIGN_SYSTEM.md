# Mealfy — Ficha de Design (Design System)

Documento de referência visual extraído do código-fonte atual (`src/index.css`, `src/components/ui`, e CSS por página). Use como guia para manter consistência ao criar/ajustar telas.

---

## 1. Cores

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#00365F` (azul-marinho) | Cor de marca principal — botões primários, títulos, ícones ativos, header da tab bar |
| `--color-primary-container` | `#0A4F86` | Estado `:active` de botões primários, variações mais claras do azul |
| `--color-secondary` | `#C7A754` (dourado/mostarda) | CTA de destaque ("Alimente uma criança"), badges, FAB de doação |
| `--color-secondary-container` | `#E9D7A2` | Estado `:active` do secundário, fundos suaves de destaque |
| `--color-background` | `#F9F9F9` | Fundo padrão das páginas |
| `--color-surface-highest` | `#E2E2E2` | Fundos de cards "elevados", estados ativos de outline |
| `--color-text-main` | `#1A1C1C` | Texto principal |
| `--color-text-inverted` | `#FFFFFF` | Texto sobre fundos escuros/imagens |
| `--color-outline` | `#906F6C` (marrom rosado) | Texto secundário/legendas, ícones neutros |
| `--color-outline-variant` | `#E4BEB9` (salmão claro) | Bordas padrão de inputs/cards/botões outline |
| `--color-success` | `#28A745` | Estados de sucesso (ex.: "Ativo") |
| `--color-error` | `#DC3545` | Estados de erro, alertas, "Cancelar" |

> ⚠️ Nota: `--color-outline-variant` (`#E4BEB9`) é tecnicamente um tom salmão, não cinza — é usado como cor de borda padrão em quase todos os componentes `outline`/`form-input`. É intencional (parte da paleta), mas vale revisar se o contraste é suficiente em todos os contextos.

---

## 2. Tipografia

- **Família única**: `'Plus Jakarta Sans'` (Google Fonts), pesos 400/500/600/700/800/900.
- Headings (`h1`–`h6`) sempre `font-weight: 700` por padrão; muitos componentes sobrescrevem para `800`/`900`.

| Estilo | Tamanho | Peso | Onde aparece |
|---|---|---|---|
| Logo "Mealfy" | `26px`, *italic*, `900` | Header da Home |
| Hero headline | `2.2rem` (`35.2px`), `800`, `letter-spacing: -0.5px` | Título grande da Home |
| Título de seção / página | `1.5rem` (`24px`), `800`, `letter-spacing: -0.5px` | `.page-title` |
| Subtítulo "social title" | `22px`, `800` | Seções de destaque |
| Subtítulo de página | `0.95rem` | `.page-subtitle`, cor `--color-outline` |
| Corpo / texto padrão | `1rem` (`16px`), `400` | Texto geral |
| Eyebrow / label uppercase | `11px`–`0.75rem`, `700`, `uppercase`, `letter-spacing: 0.05–0.08em` | `.form-label`, "COMUNIDADE ATIVA", "VALOR PROGRAMADO" |
| Tab bar / labels pequenos | `0.7rem`, `600` | `.tab-item span` |

---

## 3. Espaçamento (escala)

```
--spacing-1: 0.25rem   (4px)
--spacing-2: 0.5rem    (8px)
--spacing-3: 0.75rem   (12px)
--spacing-4: 1rem      (16px)
--spacing-5: 1.5rem    (24px)
--spacing-6: 2rem      (32px)
--spacing-8: 3rem      (48px)
```

Padding padrão de página/conteúdo: `16px` (`p-4`). Botões grandes usam `16px 32px`.

---

## 4. Bordas e Raio

```
--radius-sm:   0px
--radius-md:   2px
--radius-lg:   4px
--radius-xl:   4px
--radius-full: 9999px (círculos/pills)
```

A linguagem visual é **geométrica/quadrada** — quase tudo (botões, cards, inputs) usa `4px` de raio, exceto avatares e o botão "voltar" do header, que são círculos (`50%` / `radius-full`).

---

## 5. Sombras

```
--shadow-sm: 0 2px 4px rgba(0,0,0,.02), 0 1px 2px rgba(0,0,0,.04)   → cards, inputs
--shadow-md: 0 8px 16px rgba(0,0,0,.04), 0 4px 8px rgba(0,0,0,.02)  → FAB de doação, elementos flutuantes
--shadow-lg: 0 16px 32px rgba(0,0,0,.06), 0 8px 16px rgba(0,0,0,.03) → modais/bottom sheets
```

Há também `.shadow-glow` (sombra dourada `rgba(199,167,84,0.2)`) usada nos botões de CTA principais (cor secundária).

---

## 6. Botões (`Button.tsx` / `Button.css`)

**Variantes** (`variant` prop):

| Variante | Fundo | Texto | Borda | Uso |
|---|---|---|---|---|
| `primary` (default) | gradiente sobre `--color-primary` | branco | `rgba(0,0,0,.1)` | Ações principais (Entrar, Definir Perfil, etc.) |
| `secondary` | `--color-secondary` | `--color-text-main` | — | Ações de destaque/CTA (combinado com `.shadow-glow`) |
| `outline` | `--color-background` | `--color-text-main` | `1.5px solid --color-outline-variant` | Ações secundárias |
| `ghost` | transparente | `--color-primary` | — | Links/ações terciárias |

**Tamanhos** (`size` prop): `small` (8×16px, 0.875rem), `medium` (12×24px, 1rem — default), `large` (16×32px, 1.125rem).

**Comportamento comum**: `:active` → `scale(0.97)`; `:disabled` → `opacity: 0.6`.

**Classes auxiliares notáveis**:
- `.shadow-glow` — destaque dourado para CTAs principais.
- `.border-inverted` — variante outline para usar sobre imagens/fundos escuros (texto e borda brancos, fundo levemente translúcido).
- `.fixed-bottom-action` — barra de ação fixa na base da tela, com gradiente de "fade" (`linear-gradient(to top, --color-background 60%, transparent)`), posicionada acima da tab bar (`bottom: 80px`).

---

## 7. Navegação (Bottom Tab Bar)

- Componente `glassmorphism`: fundo `rgba(255,255,255,0.75)` + `blur(16px)`, borda `1px solid rgba(255,255,255,0.25)`.
- Altura: `70px` + safe-area inferior.
- Itens (`.tab-item`): ícone (`lucide-react`, 22px) + label (`0.7rem`, `600`). Cor inativa = `--color-outline`; ativa = `--color-primary`.
- **Item de destaque ("Alimente")**: ícone dentro de um quadrado `50×50px`, `--color-primary`, `radius-xl`, borda branca `3px`, flutuando `-24px` acima da barra (estilo FAB). Quando ativo, troca para `--color-secondary`.

**Conjuntos de navegação por papel**:
- **Doador**: Início · Mapa · Alimente (FAB) · Perfil
- **Entidade**: Painel · Cadastrar · Perfil
- **Beneficiário**: Início · Perfil
- **Admin**: Admin · Perfil

---

## 8. Padrões de layout

- **Header de página padrão**: botão "voltar" circular (`40×40px`, fundo `--color-surface-highest`) + título centralizado/à esquerda.
- **Hero (Home)**: imagem full-bleed com overlay em gradiente (`rgba(0,0,0,.15)` → `rgba(0,54,95,.98)`), conteúdo sobreposto em texto branco.
- **Cards**: fundo branco/`--color-background`, borda `1px solid --color-outline-variant` ou `--color-surface-highest`, `radius-xl` (4px), `--shadow-sm`.
- **Glassmorphism**: reservado para a tab bar e overlays sobre imagens/mapas.
- **Botão de ação fixo (`fixed-bottom-action`)**: usado em fluxos de doação/seleção; deve respeitar `bottom: 80px` (acima da tab bar) e o conteúdo da página precisa de `padding/margin-bottom` suficiente (≈170px) para não ficar coberto.

---

## 9. Ícones

- Biblioteca: **lucide-react**, tamanhos comuns `14`, `18`, `20`, `22`, `24px`.
- Avatares de usuário/família: **quadrados** com `radius-md`/`radius-xl` e iniciais (não círculos) — reforça a linguagem geométrica.

---

## 10. Tom de voz / conteúdo

- Português do Brasil, tom acolhedor e direto ("Alimente uma criança. Combata a fome.").
- Labels de categoria em **uppercase** com `letter-spacing` (ex.: "COMUNIDADE ATIVA", "VALOR PROGRAMADO", "CONTAS PARA TESTE").
- Abreviações de frequência: usar **"/mês"** e **"/semana"** (forma completa) — evitar abreviações ambíguas como "/sem".

---

## 11. Pontos de atenção conhecidos

- `--color-outline-variant` é salmão (`#E4BEB9`), não cinza — usado amplamente como cor de borda "neutra".
- Variável `--color-primary-rgb` é referenciada em `App.css` (`shadow-glow-soft`) mas **não está definida** em `:root` — corrigir ou remover o uso.
- Classes utilitárias como `mb-8`/`mb-12`/etc. (estilo Tailwind) **não existem** em `index.css` — apenas `mb-2` e `mb-4` estão definidas. Evitar usar classes de espaçamento que não existem no projeto (Tailwind não está configurado).
