# Mealfy no celular (Expo Go + APK)

O app mobile é um **WebView** do site Mealfy (carrossel, mapa, cadastros, doação).

## Pré-requisitos

- PC e celular na **mesma Wi‑Fi**
- [Expo Go](https://expo.dev/go) instalado no Android/iPhone
- Conta Expo (gratuita) só para **gerar APK** → [expo.dev/signup](https://expo.dev/signup)

---

## Expo Go (desenvolvimento)

### 1. Três terminais no PC

```powershell
cd Mealfy

# Terminal 1 — API
npm run dev:api

# Terminal 2 — Site
npm run dev

# Terminal 3 — Expo (sincroniza IP + QR Code)
npm run expo:go
```

Atalho equivalente: `npm run dev:mobile`

### 2. No celular

1. Abra **Expo Go**
2. Escaneie o **QR Code** do terminal 3
3. Aguarde o site carregar

### Se não conectar

```powershell
npm run sync:lan      # atualiza IP no .env
npm run firewall      # PowerShell como Administrador
npm run dev:check     # testa site + API
```

Teste no navegador do celular: `http://SEU_IP:5173` (o IP aparece no `sync:lan`).

### Rede difícil (4G / Wi‑Fi bloqueada)

```powershell
npm run dev:mobile:tunnel
```

Mais lento, mas passa pela internet da Expo.

---

## Baixar APK (instalar no Android)

O APK embute a URL do site (`http://SEU_IP:5173`). **PC e celular na mesma Wi‑Fi** com `npm run dev` e `npm run dev:api` rodando.

### Build na nuvem (recomendado)

```powershell
cd Mealfy
npm install -g eas-cli   # se ainda não tiver
eas login
npm run build:apk
```

No fim, abra o **link** no terminal e baixe o `.apk`.

Instale no Android → permitir **fontes desconhecidas**.

### Build local (Android Studio instalado)

```powershell
npm run build:apk:local
```

Gera `Mealfy-release.apk` na pasta do projeto.

---

## Variáveis (`mobile/.env`)

Atualizadas automaticamente por `npm run sync:lan`:

| Variável | Uso |
|----------|-----|
| `EXPO_PUBLIC_WEB_APP_URL` | Site no WebView |
| `EXPO_PUBLIC_API_URL` | API (referência) |

---

## Produção (futuro)

Quando o site estiver publicado (ex.: Firebase Hosting), altere no `eas.json` perfil `production` as URLs para `https://...` e rode:

```powershell
cd mobile
eas build --platform android --profile production
```
