# Onde paramos — Mealfy

Atualizado: 25/05/2026

## Quando chegar em casa — gerar o APK

### Opcao rapida (mesma Wi-Fi, teste hoje)

```powershell
cd Mealfy

# 1) Preparar (build do site + IP + EAS)
npm run prepare:apk:local

# 2) Servidores (2 terminais)
npm run dev:api
npm run dev

# 3) Gerar APK (~10-20 min) — link de download no terminal
npm run build:apk
```

Guia detalhado: **COMO-BAIXAR-APK.md**

### Opcao enviar para outra pessoa (4G / outra cidade)

1. Publicar API no Render (ver **DEPLOY-PRODUCAO.md**)
2. Editar `.env.production` — trocar `SEU-SERVICO` pela URL da API
3. `npm run deploy:web`
4. `npm run prepare:apk:prod`
5. `npm run build:apk:prod`

---

## O que ja esta pronto no codigo

- Cadastro doador, entidade, beneficiario
- Login com senha (demo `@mealfy.com` → **mealfy123**)
- Admin, carrossel, mapa, entidade, gift iFood, Firebase
- Scripts: `prepare:apk`, `build:apk`, `stop:api`, `sync:lan`
- App mobile v1.1.0 (versionCode 2)
- Correcao TypeScript no cadastro beneficiario (build APK)

---

## Retomar desenvolvimento normal

```powershell
cd Mealfy
npm run dev:api    # terminal 1
npm run dev        # terminal 2
```

http://localhost:5173

**Admin:** `admin@mealfy.com` / `mealfy123` (rodape → acesso administrativo)

Se API travar: `npm run stop:api` depois `npm run dev:api`

---

## Requisitos APK (uma vez em casa)

```powershell
npm install -g eas-cli
eas login
```

Conta gratuita: https://expo.dev

---

## Repo

https://github.com/Joavl/Mealfy

Arquivos nao vao pro Git: `.env`, `.env.production`, `firebase-service-account.json`
