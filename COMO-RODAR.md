# Mealfy — como rodar (localhost NÃO abre sozinho)

`localhost` só funciona **depois** de iniciar os servidores. Se o navegador der erro, é porque falta um destes comandos.

## Seu IP na rede (celular / Expo)

No PowerShell:

```powershell
ipconfig
```

Use o **IPv4 da Wi‑Fi** (ex.: `192.168.0.101`). **Não use `localhost` no celular.**

---

## Firebase (cadastro / login)

```powershell
cd Mealfy
npm run setup:firebase
```

Isso configura o `.env` com o projeto `christiano-c5714`. A API valida tokens pelo **WebApiKey** (dev) ou pelo JSON de service account (produção).

**No Console Firebase** (login Google — uma vez):
1. Authentication → ativar **E-mail/senha** e **Google**
2. Firestore → criar banco
3. Authentication → Settings → **localhost** nos domínios autorizados

Detalhes: `FIREBASE-SETUP.md`

---

## Passo a passo (PC)

### 1. API (porta 3000)

```powershell
cd Mealfy
npm run dev:api
```

Deixe esse terminal aberto. Teste: http://localhost:3000/health → deve responder.

Se der *“porta em uso”*, algo já está na 3000 (pode ser a API antiga). Feche o outro terminal ou mate o processo na porta 3000.

### 2. Site completo (porta 5173) — carrossel, mapa, doação

**Novo terminal:**

```powershell
cd Mealfy
npm run dev
```

Deixe aberto. Abra no navegador:

- http://localhost:5173  
- ou http://192.168.0.101:5173  

Tem que aparecer o Mealfy com **carrossel de doadores** no topo.

### 3. Firewall (se o celular não abrir o site)

PowerShell **como Administrador**:

```powershell
cd Mealfy
npm run firewall
```

### 4. Expo Go (celular)

**Antes:** atualize o IP da rede (troca quando muda de Wi-Fi):

```powershell
npm run sync:lan
```

**Outro terminal:**

```powershell
npm run dev:mobile
```

Escaneie o QR no **Expo Go** (mesma Wi-Fi). O app abre o site da etapa 2 — **etapa 2 tem que estar rodando**.

Se ficar em branco: toque **↻** no topo do app.

**Wi-Fi difícil?** Use túnel:

```powershell
npm run dev:mobile:tunnel
```

---

## Banco SQLite (API .NET)

Se a API falhar ao iniciar após atualização, apague o arquivo `server/src/Mealfy.Api/mealfy.dev.db` e rode `npm run dev:api` de novo (recria tabelas + usuários demo).

**Contas demo:**
- Doador: `doador@mealfy.com`
- Beneficiário: `beneficiario@mealfy.com` (recebe gifts iFood)
- Entidade: `entidade@mealfy.com`
- Admin: `admin@mealfy.com`

---

## Arquivo `.env` (raiz Mealfy)

Para login/API no celular funcionar:

```
VITE_API_URL=http://192.168.0.101:3000
VITE_DISABLE_LOCAL_FALLBACK=false
```

Troque `192.168.0.101` pelo seu IPv4.

## `mobile/.env`

```
EXPO_PUBLIC_WEB_APP_URL=http://192.168.0.101:5173
EXPO_PUBLIC_API_URL=http://192.168.0.101:3000
```

---

## Contas de teste

| Perfil | E-mail |
|--------|--------|
| Doador | doador@mealfy.com |
| Entidade | entidade@mealfy.com |
| Admin | admin@mealfy.com |

Senha mock: qualquer (ex. `mock`).
