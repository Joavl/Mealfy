# Firebase — Mealfy

## 1. Frontend (já integrado)

Copie `.env.example` para `.env` na raiz do projeto Mealfy.

O app usa:
- **Authentication** — cadastro e login (e-mail/senha e Google)
- **Firestore** — coleção `users/{uid}` com perfil do usuário
- **Analytics** — opcional, no navegador

## 2. Console Firebase

1. [Firebase Console](https://console.firebase.google.com/) → projeto `christiano-c5714`
2. **Authentication** → Sign-in method → ative **E-mail/senha** e **Google**
3. **Firestore** → Criar banco → modo teste (dev) ou regras:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 3. API .NET (validar token no servidor)

1. Console → **Configurações do projeto** → **Contas de serviço**
2. **Gerar nova chave privada** (JSON)
3. Salve como `server/src/Mealfy.Api/firebase-service-account.json` (não commitar)
4. Em `appsettings.Development.json` já está:

```json
"Firebase": {
  "ProjectId": "christiano-c5714",
  "CredentialsPath": "firebase-service-account.json"
}
```

**Modo desenvolvimento (já ativo):** a API usa `Firebase:WebApiKey` no `appsettings` para validar tokens **sem** o JSON de service account. Cadastro e login funcionam assim que Authentication estiver ativo no Console.

Para produção, use o JSON de service account (mais seguro).

## 4. Fluxo

| Ação | Firebase | API Mealfy |
|------|----------|------------|
| Criar conta doador | `createUserWithEmailAndPassword` + Firestore `users` | `POST /auth/register/donor` + `idToken` |
| Criar entidade | idem | `POST /auth/register/entity` + `idToken` |
| Login e-mail | `signInWithEmailAndPassword` | `POST /auth/login/firebase` |
| Login Google | `signInWithPopup` | `POST /auth/login/firebase` |
| Beneficiário demo | — | `login/mock` (sem senha) |

## 5. Habilitar Google no localhost

Authentication → Settings → **Authorized domains** → adicione `localhost`.
