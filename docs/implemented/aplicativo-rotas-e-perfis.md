# Aplicativo, rotas e perfis

## Estado: implementado parcialmente

O cliente é uma SPA React/Vite, empacotável por Capacitor. A árvore de rotas existe e separa experiências de doador, entidade, beneficiário e administrador.

## Rotas e controle na interface

`src/App.tsx` usa `BrowserRouter`, `PrivateRoute` e `DashboardRedirect`.

| Perfil | Rotas verificadas | Controle atual |
|---|---|---|
| Doador | `/`, `/explore`, `/map`, `/donate`, `/big-donation`, `/recurrence`, `/indicate-family` | `PrivateRoute` exige sessão e role `donor`. |
| Entidade | `/entity/dashboard`, `/register-family` | Dashboard exige `entity`; cadastro também permite `donor` em `src/App.tsx:105`. |
| Beneficiário | `/beneficiary/dashboard` | Exige role `beneficiary`. |
| Administrador | `/admin` | Exige role `admin`. |
| Público | `/auth`, `/register`, `/forgot-password`, `/support`, `/help`, `/privacy` | Não passam pelo guarda de rota. |

O redirecionamento pós-sessão leva cada papel ao dashboard correspondente (`src/App.tsx:128-141`). A proteção no navegador não substitui a autorização do backend; as rotas Express usam `authGuard` e `roleGuard` em diversos módulos.

## Componentes e experiência existente

- Layout global com barra inferior e cabeçalhos: `src/components/layout/BottomTabBar.tsx`, `src/components/layout/AppHeader.tsx`.
- Toasts e telas de carregamento: `src/context/ToastContext.tsx`, `src/components/ui/SplashScreen.tsx`.
- Mapa com Leaflet e geolocalização aproximada: `src/pages/MapView.tsx`, `@capacitor/geolocation` e permissão `ACCESS_COARSE_LOCATION` no manifesto Android.
- Telas de comunidade, família, perfil, suporte e ajuda existem em `src/pages/`.

## Limitações verificadas

- Todas as páginas são importadas estaticamente em `src/App.tsx:9-30`; mapa, dashboards e painel admin entram no grafo inicial. Não há code splitting por rota.
- A declaração de PWA não foi encontrada: `vite.config.ts` contém apenas o plugin React; não há plugin PWA, manifest ou service worker nos arquivos inspecionados.
- A rota e as interfaces existem, mas algumas operações internas ainda são simuladas ou dependem de `localStorage`. Veja [mocks e fluxos incompletos](../pending/mocks-e-fluxos-incompletos.md).
