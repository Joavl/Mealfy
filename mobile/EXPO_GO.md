# Expo Go = site Mealfy completo

No celular você vê **o mesmo site** do PC:

- Carrossel de doadores (Stories)
- Mapa e localizações
- Doação iFood, entidade, perfil, etc.

## Obrigatório: 2 terminais no PC

```powershell
cd Mealfy

# Terminal 1 — API
npm run dev:api

# Terminal 2 — SITE (sem isso = tela de erro no Expo)
npm run dev
```

Abra no PC para conferir: **http://localhost:5173** — deve ter carrossel e mapa.

## Terminal 3 — Expo

```powershell
npm run dev:mobile
```

Escaneie o QR (mesma Wi‑Fi).

## `.env`

Raiz `Mealfy/.env` (API no celular):

```
VITE_API_URL=http://SEU_IP:3000
```

`mobile/.env` (URL do site no WebView):

```
EXPO_PUBLIC_WEB_APP_URL=http://SEU_IP:5173
```

`ipconfig` → IPv4 da Wi‑Fi.
