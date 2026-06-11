# Onde Paramos — Mealfy

## Estado Atual da Branch (refactor/full-typescript)

O projeto foi totalmente migrado para um ecossistema unificado em **JavaScript/TypeScript**, removendo por completo a API legada em C# (ASP.NET Core) e o banco de dados SQL Server.

### O que foi feito:
1. **Remoção de Arquivos Legados**: Exclusão completa das pastas `/server`, `/legacy-csharp-backend` e todos os arquivos `.cs`, `.csproj`, `.sln`.
2. **Nova API Node.js (Official)**: O diretório `/backend` agora abriga a API oficial desenvolvida em Express e TypeScript com Prisma ORM e PostgreSQL.
3. **Database Schema**: Implementado o `schema.prisma` com os relacionamentos de usuários, organizações, famílias, doações e vouchers.
4. **Middlewares**: Implementados middlewares centrais de autenticação via token do Firebase (`auth.middleware.ts`), validação por Zod e controle de acesso por perfis/funções (`role.middleware.ts`).
5. **Agnosticismo de Vouchers**: Implementada uma interface abstrata `VoucherProvider` e um `MockVoucherProvider` para remover dependências diretas de parceiros específicos.
6. **Scripts e Configurações**: Scripts de execução local centralizados na raiz (`npm run dev:api`, `npm run dev`) e scripts auxiliares PowerShell adaptados para a porta `3001` da nova API.

---

## Como Rodar o Ambiente Local

1. **Backend**:
   ```bash
   cd backend
   npm install
   # Para rodar com banco em memória (sem PostgreSQL/Firebase real):
   # Certifique-se de que no seu .env: AUTH_MODE=mock e DATABASE_MODE=memory
   npm run dev
   ```
2. **Frontend Web**:
   ```bash
   npm install
   npm run dev
   ```
   Acesse: http://localhost:5173

3. **Verificações de IP**:
   * Rode `npm run sync:lan` para alinhar os arquivos `.env` com a Wi-Fi local de testes para o mobile.
