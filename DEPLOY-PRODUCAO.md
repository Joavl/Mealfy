# Mealfy — APK para qualquer cidade (produção)

O APK de **teste** (`npm run build:apk`) só funciona na sua Wi‑Fi.  
Para **outra cidade / 4G**, publique site + API na internet e gere o APK de produção.

## Resumo (3 passos)

1. **API** na nuvem (Render, grátis) → URL `https://....onrender.com`
2. **Site** no Firebase Hosting → `https://christiano-c5714.web.app`
3. **APK** com `npm run build:apk:prod`

---

## 1. Configurar `.env.production`

```powershell
cd Mealfy
copy .env.production.example .env.production
```

Edite `.env.production` e troque `SEU-SERVICO` pela URL real da API (passo 2).

---

## 2. Publicar a API (Render)

1. Crie conta em [render.com](https://render.com)
2. **New → Blueprint** (ou Web Service → Docker)
3. Conecte o repositório Git do projeto
4. Root: pasta `Mealfy`, Dockerfile na raiz
5. Variáveis de ambiente (Environment):
   - `Firebase__WebApiKey` = mesma chave do `.env` (`VITE_FIREBASE_API_KEY`)
6. Deploy → copie a URL, ex: `https://mealfy-api-xxxx.onrender.com`
7. Teste: abra `https://SUA-URL/health` → deve retornar `{"status":"ok",...}`

Coloque essa URL em `.env.production`:

```env
VITE_API_URL=https://mealfy-api-xxxx.onrender.com
EXPO_PUBLIC_API_URL=https://mealfy-api-xxxx.onrender.com
```

> O plano gratuito do Render “dorme” após inatividade; o primeiro acesso pode demorar ~1 min.

---

## 3. Publicar o site (Firebase Hosting)

```powershell
npm install -g firebase-tools
firebase login
npm run deploy:web
```

O site ficará em **https://christiano-c5714.web.app** (ou o domínio do seu projeto Firebase).

No [Firebase Console](https://console.firebase.google.com) → Authentication → Settings → **Authorized domains**, confira que estão:

- `christiano-c5714.web.app`
- `christiano-c5714.firebaseapp.com`

---

## 4. Gerar APK de produção

```powershell
npm run build:apk:prod
```

Baixe o APK pelo link do Expo (EAS). Envie para qualquer pessoa — **não precisa** do seu PC ligado nem da mesma rede.

---

## Comandos úteis

| Comando | Uso |
|---------|-----|
| `npm run build:apk` | APK **local** (só sua Wi‑Fi) |
| `npm run build:apk:prod` | APK **internet** |
| `npm run deploy:web` | Só o site |
| `npm run deploy:prod` | Site + instruções da API |

---

## Problemas comuns

| Sintoma | Solução |
|---------|---------|
| Tela branca no APK | Rode `npm run deploy:web` de novo; confira URL em `.env.production` |
| Login não funciona | Domínios autorizados no Firebase Auth |
| API lenta no 1º uso | Render free tier acordando — espere e tente de novo |
| Erro ao gerar APK | `eas login` e `.env.production` com URLs **https** (sem 192.168.x) |
