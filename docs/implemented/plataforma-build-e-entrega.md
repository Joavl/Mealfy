# Plataforma, build e entrega

## Estado: implementado parcialmente

## Configuração existente

- Web: React, TypeScript e Vite (`package.json`, `vite.config.ts`).
- Nativo: Capacitor com `appId` `com.mealfy.app`, `webDir` `dist` e esquema HTTPS no Android (`capacitor.config.ts`).
- Android: manifesto declara internet, rede e localização aproximada; `android:allowBackup="true"` está ativo (`android/app/src/main/AndroidManifest.xml`).
- Docker frontend: `Dockerfile` raiz compila Vite e serve SPA pelo Nginx com fallback de rota e healthcheck.
- Docker backend: existe `backend/Dockerfile`; `backend/README.md` documenta deploy separado em Railway/Render, migrations e `/health`.
- CI mobile: workflows para Android e iOS em `.github/workflows/`.

## O que os workflows fazem

- Android instala dependências, compila o frontend, sincroniza Capacitor e produz **APK debug** (`android-build.yml:25-51`).
- iOS instala dependências, adiciona a plataforma, compila para simulador sem assinatura e declara explicitamente que o artefato não é distribuível em iPhone físico (`ios-build.yml:1-6`, `55-64`).

## Estado das verificações

Nesta análise:

| Comando | Resultado |
|---|---|
| `npm run build` | Falhou: `src/pages/Profile.tsx:41` referencia `User` sem importação. |
| `npm run lint` | Falhou com 111 erros; também analisou artefatos Android gerados. |
| `cd backend && npm run typecheck` | Falhou em `ranking.service.ts:64`. |

Não há scripts `test` ou `coverage` nos `package.json` raiz ou backend. A única ocorrência de teste rastreado observada foi template padrão Android. Não é possível comprovar cobertura de 80%.

## Limitações de entrega

- O workflow Android não gera AAB assinado de release.
- O workflow iOS não gera aplicação assinada ou TestFlight.
- Não foram encontrados workflows de teste, typecheck backend, lint, SCA/audit, build de backend ou deploy.
- Arquivos gerados sob `android/.gradle` e `android/app/build` estão rastreados; também interferem no lint.
- `README.md` raiz permanece template do Vite.
