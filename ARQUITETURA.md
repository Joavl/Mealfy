# Mealfy — Arquitetura

## Visão geral

| Camada | Tecnologia | Pasta |
|--------|------------|--------|
| **Web** | React + Vite | `Mealfy/` (raiz do front) |
| **Mobile** | Expo (React Native) | `Mealfy/mobile/` |
| **API** | ASP.NET Core 8 | `Mealfy/server/` |
| **Banco relacional** | SQL Server + EF Core | LocalDB em dev |
| **Auth / push** | Firebase | Console Firebase (você cria a conta) |

## Por que SQL Server + Firebase?

- **SQL Server (EF Core):** dados de negócio — usuários, entidades, famílias, validações (CadÚnico, Bolsa Família, SISVAN, IVCAD), doações, vínculos.
- **Firebase:** login (e-mail/senha, Google), notificações push (FCM) e, se quiser depois, Firestore só para chat/eventos em tempo real — **não duplicar** o cadastro principal no Firestore.

## API ASP.NET

```bash
cd Mealfy/server
dotnet run --project src/Mealfy.Api
```

- Swagger: http://localhost:3000/swagger  
- Health: http://localhost:3000/health  
- Rotas compatíveis com o front: `/auth/*`, `/families/*` (demais módulos migram do Node aos poucos)

### Connection string

Edite `server/src/Mealfy.Api/appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=Mealfy;..."
}
```

Para SQL Server instalado:

```json
"DefaultConnection": "Server=localhost;Database=Mealfy;Trusted_Connection=True;TrustServerCertificate=True"
```

### Firebase na API

1. Crie projeto em https://console.firebase.google.com  
2. Ative **Authentication** (e-mail/senha, Google)  
3. Gere **Service Account** → baixe JSON  
4. Em `appsettings.json`:

```json
"Firebase": {
  "ProjectId": "seu-projeto-id",
  "CredentialsPath": "C:\\caminho\\seguro\\firebase-adminsdk.json"
}
```

5. Front/mobile enviam `POST /auth/login/firebase` com `{ "idToken": "..." }`

## Web

```bash
cd Mealfy
npm run dev
```

`.env`: `VITE_API_URL=http://localhost:3000`

## Mobile

```bash
cd Mealfy/mobile
npm install
npm start
```

## Contas demo (seed)

| Papel | E-mail |
|-------|--------|
| Doador | doador@mealfy.com |
| Entidade | entidade@mealfy.com |

Login mock: `POST /auth/login/mock` com `{ "email": "doador@mealfy.com", "password": "x" }`

## Próximos passos

1. Você cria o projeto Firebase e preenche as chaves  
2. Migrar rotas restantes do Node (`/donations`, `/indications`, `/admin`) para ASP.NET  
3. Publicar API (Azure App Service / Railway) + SQL Azure  
4. Build mobile (EAS) para Android/iOS
