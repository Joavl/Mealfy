# Onde paramos — Mealfy

## Feito (no codigo)

- Doacao via **gift iFood** (doador envia, beneficiario recebe no painel)
- **API Facebook** (carrossel + login)
- **Admin** carrossel de doadores em destaque
- **Firebase** no frontend (cadastro/login e-mail, Google, Firestore `users`)
- API .NET com doacoes, gift cards, auth Firebase (WebApiKey em dev)
- **Expo Go** = WebView do site completo (carrossel, mapa, doacao)
- Scripts: `sync:lan`, `dev:check`, `firewall`, `setup:firebase`

## Pendente (quando voce chegar em casa)

### 1. Firebase Console (5 min, login Google)

1. [Authentication](https://console.firebase.google.com/project/christiano-c5714/authentication/providers) — E-mail/senha + Google
2. [Firestore](https://console.firebase.google.com/project/christiano-c5714/firestore) — criar banco
3. Authentication → Settings → dominio **localhost**

### 2. Expo Go no celular

```powershell
cd Mealfy

# Terminal 1
npm run dev:api

# Terminal 2
npm run dev

# Terminal 3 (atualiza IP + abre Expo)
npm run dev:mobile
```

- PC e celular na **mesma Wi-Fi**
- Se nao abrir: PowerShell **Admin** → `npm run firewall`
- No Expo Go: escanear QR; se branco, toque **↻** no topo do app
- Alternativa sem Wi-Fi: `npm run dev:mobile:tunnel` (mais lento)

### 3. Opcional depois

- Commit/push das ultimas alteracoes
- JSON `firebase-service-account.json` na API (producao)
- Login Facebook OAuth real (hoje abre pagina Mealfy)

## Contas demo (API)

| Perfil | E-mail |
|--------|--------|
| Doador | doador@mealfy.com |
| Beneficiario | beneficiario@mealfy.com |
| Entidade | entidade@mealfy.com |
| Admin | admin@mealfy.com |

Login mock: qualquer senha ou deixar em branco no modo demo.
