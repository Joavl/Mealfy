# Mealfy — Arquitetura do Sistema

## Visão Geral da Stack

| Camada | Tecnologia | Pasta |
|---|---|---|
| **Web (Frontend)** | React + TypeScript + Vite | `src/` (raiz) |
| **Mobile (Frontend)** | Expo (React Native) | `mobile/` |
| **API (Backend)** | Node.js + Express + TypeScript | `backend/` |
| **Banco de Dados** | PostgreSQL + Prisma ORM | Configurado via Prisma |
| **Autenticação** | Firebase Authentication | Admin SDK no Backend |

---

## Banco de Dados (PostgreSQL + Prisma)

O banco de dados relacional armazena toda a lógica e dados de negócio: usuários, organizações parceiras, famílias, indicações, doações realizadas e auditorias de controle.

### Configuração do Banco
No arquivo `backend/.env`:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/mealfy?schema=public"
```

Gere o cliente e execute as migrations:
```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

---

## Autenticação com Firebase

O **Firebase Authentication** é a fonte primária de identidade do usuário. O fluxo de autenticação funciona da seguinte maneira:

1. O aplicativo cliente (Web/Mobile) realiza a autenticação direta no Firebase (E-mail/Senha ou Login com Google) e obtém um **ID Token (JWT)**.
2. O cliente envia esse token no cabeçalho das requisições HTTP (`Authorization: Bearer <ID_TOKEN>`).
3. O middleware `auth.middleware.ts` do backend intercepta a requisição:
   * Valida o token com o SDK `firebase-admin`.
   * Recupera o `uid`, `email` e `name` do token.
   * Localiza ou cadastra o usuário no banco de dados local PostgreSQL, relacionando-o pelo campo exclusivo `firebaseUid`.
   * Insere o usuário autenticado na requisição (`req.user`) para controle de permissões.

---

## Lógica e Regras de Negócio Importantes

* **Validação Geográfica (Jitter)**: Para que os pinos de famílias no mapa não fiquem sobrepostos no mesmo ponto central, adiciona-se uma variação aleatória (jitter) nas coordenadas geográficas de latitude/longitude ao registrar famílias em Heliópolis, Paraisópolis, Cidade Tiradentes ou Grajaú.
* **Redirecionamento de Doações Regionais**: Uma doação em lote focada em uma região específica distribui o saldo total igualmente entre todas as famílias que possuem o status `needs_help` naquela localidade, emitindo vouchers alimentares individuais.
* **Privacidade no Ranking**: O ranking de doadores lista os usuários com o papel `DONOR` ordenados pelo montante de doações. Caso o usuário tenha configurado privacidade (`anonymousMode: true`), suas informações pessoais são omitidas e ele é exibido como "Doador Anônimo".
* **Mock Mode para Testes**: O backend suporta `AUTH_MODE=mock` e `DATABASE_MODE=memory` para facilitar a execução local sem a necessidade de um servidor PostgreSQL ativo ou credenciais reais do Firebase. Estes modos são **estritamente proibidos** em ambiente de produção (`NODE_ENV=production`).
