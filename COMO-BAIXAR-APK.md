# Como baixar o APK do Mealfy

O app Android é um **WebView** do site Mealfy. O APK embute a URL do site — por isso existem dois modos.

---

## Preparacao rapida (recomendado)

```powershell
cd Mealfy
npm run prepare:apk
```

Isso valida o build do site, configura o EAS e diz qual comando usar em seguida.

Para **gerar o APK na hora** (apos preparar):

```powershell
npm run prepare:apk -- -BuildNow
```

---

## Opcao A — APK na sua rede (teste hoje)

Funciona **somente** com PC e celular na **mesma Wi-Fi**, com servidores ligados.

### Passo a passo

```powershell
cd Mealfy

# 1) Preparar
npm run prepare:apk:local

# 2) Subir servidores (2 terminais)
npm run dev:api
npm run dev

# 3) Gerar APK (~10-20 min)
npm run build:apk
```

### No celular

1. Baixe o APK pelo **link do Expo** que aparecer no terminal
2. Instale (permitir fontes desconhecidas)
3. Abra o app na mesma Wi-Fi

### Contas demo no APK

| Perfil | Login | Senha |
|--------|--------|--------|
| Admin | admin@mealfy.com | mealfy123 |
| Doador | doador@mealfy.com | mealfy123 |

---

## Opcao B — APK para qualquer lugar (outra cidade / 4G)

Precisa publicar **site + API** na internet antes.

### 1. Configure `.env.production`

```powershell
copy .env.production.example .env.production
```

Edite e troque `SEU-SERVICO` pela URL real da API (ex.: Render).

### 2. Publique

```powershell
npm run deploy:web          # Firebase Hosting
# API: veja DEPLOY-PRODUCAO.md (Render + Docker)
```

### 3. Gere o APK

```powershell
npm run prepare:apk:prod
npm run build:apk:prod
```

Qualquer pessoa com o APK abre o site publico — **sem** seu PC ligado.

---

## Requisitos (uma vez)

```powershell
npm install -g eas-cli
eas login
```

Conta gratuita: https://expo.dev

---

## Problemas comuns

| Problema | Solucao |
|----------|---------|
| `eas: command not found` | `npm install -g eas-cli` |
| Tela branca no APK | `npm run dev` + `npm run dev:api` (modo local) ou `npm run deploy:web` (modo prod) |
| Build EAS falha | `cd mobile` → `eas init` (primeira vez) |
| Login nao funciona | API ligada; admin: `admin@mealfy.com` / `mealfy123` |

---

## Comandos resumo

| Comando | Uso |
|---------|-----|
| `npm run prepare:apk` | Prepara tudo (auto: local ou prod) |
| `npm run prepare:apk:local` | Prepara APK mesma Wi-Fi |
| `npm run prepare:apk:prod` | Prepara APK internet |
| `npm run build:apk` | Gera APK local |
| `npm run build:apk:prod` | Gera APK producao |
| `npm run deploy:web` | Publica site no Firebase |
