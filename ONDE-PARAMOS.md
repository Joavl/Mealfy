# Onde paramos — Mealfy

Atualizado: 23/05/2026

## Feito recentemente

- **Cadastro primeira vez:** doador (`/register-donor`), entidade (`/register-entity`), beneficiario (`/register-beneficiary`)
- **Login com senha obrigatoria** — contas demo `@mealfy.com` usam senha **`mealfy123`** (nao Firebase)
- **Correcao login admin:** colunas SQLite em `Users` (ex.: `Facebook`), seeder garante usuario admin no banco
- **Carrossel** doadores em destaque (admin + card ao clicar)
- **Mapa** — botoes Detalhes/Doar nos popups
- **Entidade** — familias sem estrutura + atribuicao
- **Firebase** frontend + Firestore; API .NET com gift iFood, doacoes
- Scripts: `sync:lan`, `dev:check`, `firewall`, `stop:api`, `expo:go`
- Deploy producao documentado: `DEPLOY-PRODUCAO.md` (Firebase Hosting + Render + `build:apk:prod`)
- Repo GitHub: https://github.com/Joavl/Mealfy

## Como retomar (amanha)

```powershell
cd Mealfy

# Terminal 1 — API
npm run dev:api

# Terminal 2 — site
npm run dev
```

Abra http://localhost:5173

Se a API nao subir (arquivo bloqueado):

```powershell
npm run stop:api
npm run dev:api
```

## Contas demo

| Perfil | Login | Senha |
|--------|--------|--------|
| Admin | `admin@mealfy.com` | `mealfy123` |
| Doador | `doador@mealfy.com` | `mealfy123` |
| Entidade | `entidade@mealfy.com` | `mealfy123` |
| Beneficiario | CPF `123.456.789-00` | (sem senha) |

Admin: tela de entrada → rodape **"Acesso administrativo restrito"**.

Se login falhar: apague `server/src/Mealfy.Api/mealfy.dev.db` e rode `npm run dev:api` de novo.

## Celular (mesma Wi-Fi)

```powershell
npm run sync:lan
npm run dev:mobile
# ou
npm run expo:go
```

## Pendente / proximos passos

1. Firebase Console — dominios autorizados (`localhost`, hosting) se usar login Google
2. Publicar site + API para APK funcionar fora de casa → `DEPLOY-PRODUCAO.md`
3. `firebase-service-account.json` na API (opcional, producao)
4. Login Facebook OAuth real (hoje abre pagina Mealfy)

## Arquivos importantes

- `.env` — nao vai pro Git; copiar de `.env.example`
- `COMO-RODAR.md` — guia completo
- `DEPLOY-PRODUCAO.md` — APK para qualquer cidade
