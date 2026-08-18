# Login social — Google, Facebook, Apple e Gov.br

> Estado da implementação e o que ainda depende de você (credenciais externas).
> Backend e schema já prontos; falta plugar as credenciais e o login nativo no app.

---

## O que já está pronto (código)

**Backend**
- Schema Prisma: `User.cpf` (único) + modelo `OAuthAccount` (vincula vários provedores a uma conta) + enum `OAuthProvider`. Migration em `prisma/migrations/20260721000000_add_oauth_accounts/`.
- Verificação de token sem dependências novas (`oauth.providers.ts`): Google/Apple via JWKS, Facebook via Graph.
- Gov.br OIDC (Authorization Code) em `oauth.govbr.ts` — o `sub` é o **CPF verificado**.
- Find-or-create + linking por e-mail/CPF em `oauth.service.ts`.
- Rotas: `POST /auth/oauth/{google|facebook|apple}`, `GET /auth/govbr/start`, `GET /auth/govbr/callback`.
- Cada provedor só liga quando suas variáveis existem; sem elas → `501 provider_not_configured` (não quebra o boot).

**Frontend**
- `authApi.oauth(provider, token, name?)` e `authService.signInWithOAuth(...)` prontos.
- `GET /auth/providers` diz quais provedores o servidor tem credencial para atender;
  a tela de login consome isso e **habilita o botão só quando há credencial**.
  Sem isso o app ofereceria um botão que estoura 501 e o usuário só descobriria tentando.
- Os botões **não fingem mais sucesso**: antes, clicar em Meta/Apple exibia
  "Login realizado com sucesso" sem chamar nada. Agora mostram "Em breve"
  (desabilitados) até existir credencial.

**O que ainda falta no app:** o SDK que obtém o token no dispositivo.
O backend já verifica o token e emite a sessão; falta a ponta que produz esse token
(plugin nativo no Capacitor; SDK do provedor na web). Enquanto isso, um provedor
configurado mas sem SDK devolve erro explícito em vez de silêncio.

**Android**
- `signingConfig` de release lê `android/keystore.properties` se existir (build de debug do CI segue funcionando sem ele).

---

## O que falta (você) — por provedor

### 1. Keystore Android (destrava Google/Facebook + build assinado)
```
keytool -genkeypair -v -keystore mealfy-release.jks -alias mealfy -keyalg RSA -keysize 2048 -validity 10000
keytool -list -v -keystore mealfy-release.jks -alias mealfy   # pega SHA-1 / SHA-256
```
Copie `android/keystore.properties.example` → `android/keystore.properties` e preencha as senhas.
**Guarde o `.jks` e as senhas em local seguro — perdê-los = não atualizar mais o app publicado.**

### 2. Google
- Google Cloud Console → tela de consentimento OAuth → 3 Client IDs (Web, Android com SHA-1, iOS).
- Backend: `GOOGLE_CLIENT_ID` = o Client ID **Web**.
- App: instalar plugin nativo (ex. `@codetrix-studio/capacitor-google-auth`) e chamar `authService.signInWithOAuth('google', idToken)`.

### 3. Facebook / Meta
- Meta for Developers → criar app → Facebook Login → key hashes (Android) + bundle (iOS).
- Backend: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`.
- App: plugin `@capacitor-community/facebook-login`. ⚠️ pode não retornar e-mail (já tratado no backend).

### 4. Apple (obrigatório no iOS se houver Google/Facebook — App Store 4.8)
- Apple Developer → App ID + **Services ID** (client_id) + chave "Sign in with Apple".
- Backend: `APPLE_CLIENT_ID` = o Services ID.
- App: Sign in with Apple nativo → `signInWithOAuth('apple', idToken, name)` (o nome só vem no 1º login).

### 5. Gov.br (caminho crítico — exige CNPJ)
- Solicitar credenciais no portal Gov.br (precisa de **CNPJ da organização**). Liberado por ambiente: homologação → produção.
- Backend: `GOVBR_CLIENT_ID`, `GOVBR_CLIENT_SECRET`, `GOVBR_REDIRECT_URI`, `GOVBR_ENV`.
- App: abre `/auth/govbr/start` no navegador (`@capacitor/browser`) e trata o retorno por deep link.

---

## Depois de configurar
1. Rodar a migration: `cd backend && npm run prisma:deploy` (ou `prisma:migrate` em dev).
2. Preencher as variáveis no `.env` do backend (ver `.env.example`).
3. Trocar os handlers de mock em `src/pages/Auth.tsx` (marcados com `TODO(social-login)`) pela chamada real `authService.signInWithOAuth(...)`.
