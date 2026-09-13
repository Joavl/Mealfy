# Autenticação, usuários e OAuth

## Estado: implementado parcialmente

## Implementação real

O backend Express oferece cadastro, login e consulta de sessão. O frontend consome as rotas por `src/api/authApi.ts` e persiste o token através de `src/api/tokenStorage.ts`.

- Registro e login: `backend/src/modules/auth/auth.service.ts`.
- Senhas: hash/verificação por `backend/src/shared/utils/password.ts`.
- JWT: emissão em `backend/src/shared/utils/jwt.ts`; token contém `sub` e `role`.
- Proteção de API: `backend/src/shared/middlewares/authGuard.ts` e `roleGuard.ts`.
- Cliente envia `Authorization: Bearer <token>` em `src/api/apiClient.ts:36-51`.
- O contexto carrega `/me`, mapeia o usuário e controla logout em `src/context/AppContext.tsx:74-151`.

O registro público aceita `donor` e `entity` segundo o validador de autenticação. A entidade nasce com status `pending`; doador, `active` (`backend/src/modules/auth/auth.service.ts:14-28`). Login bloqueia apenas contas `blocked` ou `suspended` (`:41-46`).

## OAuth existente no backend

Há módulos OAuth, rotas e modelo `OAuthAccount`:

- `backend/src/modules/auth/oauth/**`
- `backend/prisma/schema.prisma:170-187`
- Variáveis opcionais para Google, Facebook, Apple e Gov.br em `backend/src/config/env.ts:108-128`.

O cliente tem `authService.signInWithOAuth()` que encaminha token de SDK ao backend (`src/backend/services/authService.ts:111-128`).

## Simulações e limitações

- A UI ainda inclui login Google simulado: `signInWithGoogle()` chama `MockAuthProvider` em `src/backend/services/authService.ts:131-140`; há `GoogleMockModal` e `GovBrMockModal`.
- Recuperação de senha é mock e não envia token/e-mail: `src/backend/services/authService.ts:142-146`.
- Cadastro de `beneficiary` cai no provider local, não no backend: `src/backend/services/authService.ts:149-155`.
- O fluxo legado `registerEntity()` mistura registro real com entidade em `localStorage` e envia a senha fixa `123456`; este comportamento é pendência crítica, não funcionalidade concluída (`src/backend/services/authService.ts:217-274`).
- O token bearer é guardado no mecanismo de Preferences/local storage usado pelo cliente. Não há evidência de refresh token, revogação, cookie HttpOnly ou Keychain/Keystore dedicado.

Os requisitos e ações corretivas estão em [autenticação, credenciais e sessão](../pending/autenticacao-credenciais-e-sessao.md).
