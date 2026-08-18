# Relatório de Auditoria Técnica - Backend Mealfy

**Data:** 2026-06-11
**Branch:** N/A (não é repositório git)
**Estado:** MOCK - Não utiliza Prisma, PostgreSQL ou Firebase

---

## 1. RESUMO EXECUTIVO

### Alertas Críticos

| Item | Esperado | Encontrado | Status |
|------|----------|------------|--------|
| ORM | Prisma | MockDatabase (JSON) | CRÍTICO |
| Banco | PostgreSQL | Arquivos JSON locais | CRÍTICO |
| Auth | Firebase | Header x-user-id mock | CRÍTICO |
| Migrations | Prisma migrations | Inexistente | CRÍTICO |
| Testes | Jest/Vitest | Inexistente | CRÍTICO |
| Git | Repositório versionado | Não inicializado | CRÍTICO |

### Resultado Geral

**O backend atual é um protótipo mock**, não uma implementação de produção. Todas as operações são realizadas em memória e persistidas em arquivos JSON locais, sem transações ACID, sem autenticação real e sem integridade relacional.

---

## 2. ANÁLISE ESTRUTURAL

### 2.1 Diretório backend/

```
backend/
├── package.json          # Scripts e dependências
├── tsconfig.json         # Config TypeScript
├── .env.example          # Variáveis de ambiente (modelo)
├── src/
│   ├── app.ts            # Config Express
│   ├── server.ts         # Entry point
│   ├── database/
│   │   ├── mock-db.ts    # MockDatabase (persistência JSON)
│   │   ├── seed.ts       # População inicial
│   │   └── data/         # Arquivos JSON
│   ├── modules/          # Módulos por domínio
│   └── shared/           # Código compartilhado
├── API_ROUTES.md         # Documentação de rotas
├── ARCHITECTURE.md       # Descrição arquitetural
├── AUDIT_NOTES.md        # Notas de auditoria
└── MOCK_DATA.md         # Documentação do mock
```

**Faltando:**
- `prisma/` - Não existe
- `tests/` - Não existe
- `.git/` - Não inicializado

### 2.2 Dependências (package.json)

```json
{
  "dependencies": {
    "cors": "^2.8.6",
    "express": "^4.22.1",
    "express-async-errors": "^3.1.1",
    "uuid": "^14.0.0",
    "zod": "^4.4.1"
  }
}
```

**Ausências críticas:**
- `@prisma/client` - Prisma ORM
- `firebase-admin` - Autenticação Firebase
- `pg` - Driver PostgreSQL
- `jest` ou `vitest` - Testes

---

## 3. ANÁLISE POR ARQUIVO

### 3.1 Persistência (mock-db.ts)

| Campo | Valor |
|-------|-------|
| Arquivo | `src/database/mock-db.ts` |
| Responsabilidade | Persistência em arquivos JSON |
| Estado | Funcional para protótipo |
| Problema | Sem transações, sem ACID, sem integridade |
| Correção | Substituir por Prisma ORM |

**Código atual:**
```typescript
export class MockDatabase {
  static async read<T>(fileName: string): Promise<T[]>
  static async write<T>(fileName: string, data: T[]): Promise<void>
}
```

**Problemas identificados:**
1. Sem controle de concorrência
2. Sem transações
3. Sem índices
4. Sem relacionamentos
5. Sem validação de schema
6. Sem migrações
7. Tudo em memória (risco de perda de dados)

### 3.2 Tipos Compartilhados (shared/types/index.ts)

| Campo | Valor |
|-------|-------|
| Arquivo | `src/shared/types/index.ts` |
| Responsabilidade | Definição de tipos TypeScript |
| Estado | Incompleto |
| Problema | Campos faltando, `any` usado |
| Correção | Completar tipos e remover `any` |

**Modelos atuais:**
- `User` - Incompleto (falta impactPreferences, etc.)
- `Family` - Incompleto (falta neighborhood, city, state, etc.)
- `DonorIndication` - Funcional
- `Donation` - Funcional
- `GiftCard` - Funcional

**Ausentes:**
- `Organization` - Não existe
- `Voucher` - Nome diferente (GiftCard)
- `AuditLog` - Tipado como `any`
- `FeaturedDonor` - Não existe
- `Highlight` - Não existe
- `DeviceToken` - Não existe

### 3.3 Autenticação (auth.ts)

| Campo | Valor |
|-------|-------|
| Arquivo | `src/shared/middlewares/auth.ts` |
| Responsabilidade | Middleware de autenticação |
| Estado | MOCK |
| Problema | Simula auth via header |
| Correção | Implementar Firebase Auth |

**Implementação atual:**
```typescript
const userId = req.headers['x-user-id'] || 
               req.headers['authorization']?.replace('Bearer ', '');
// Apenas busca no JSON local
```

Sem validação de token, sem expiração, sem Firebase.

### 3.4 Tratamento de Erros (errorHandler.ts)

| Campo | Valor |
|-------|-------|
| Arquivo | `src/shared/middlewares/errorHandler.ts` |
| Responsabilidade | Tratamento global de erros |
| Estado | Funcional |
| Problema | Stack trace em produção não tratado |
| Correção | Remover stack trace em produção |

---

## 4. ANÁLISE DOS MÓDULOS

### 4.1 Módulo Auth

| Arquivo | Estado | Problemas |
|---------|--------|-----------|
| auth.routes.ts | OK | Faltando rotas register/beneficiary, login/firebase |
| auth.controller.ts | OK | - |
| auth.service.ts | MOCK | Sem transação, sem Firebase UID |
| auth.validator.ts | OK | Validação básica com Zod |

**Rotas implementadas:**
- `POST /auth/register/donor` ✓
- `POST /auth/register/entity` ✓
- `POST /auth/login/mock` ✓ (mock)
- `GET /auth/me` ✓
- `PATCH /auth/me/preferences` ✓

**Rotas faltando:**
- `POST /auth/register/beneficiary` ✗
- `POST /auth/login/firebase` ✗

### 4.2 Módulo Admin

| Arquivo | Estado | Problemas |
|---------|--------|-----------|
| admin.routes.ts | OK | Faltando rotas featured-donors, donors |
| admin.service.ts | MOCK | Sem verificação real de admin |

**Rotas implementadas:**
- `GET /admin/entities/pending` ✓
- `PATCH /admin/entities/:id/approve` ✓
- `PATCH /admin/entities/:id/reject` ✓

**Rotas faltando:**
- `GET /admin/featured-donors` ✗
- `PUT /admin/featured-donors` ✗
- `GET /admin/donors` ✗

### 4.3 Módulo Donations

| Arquivo | Estado | Problemas |
|---------|--------|-----------|
| donations.routes.ts | OK | - |
| donations.controller.ts | OK | Ignora campo amount do schema |
| donations.service.ts | MOCK | Sem transação ACID |
| donations.validator.ts | OK | - |

**Problema crítico em donations.service.ts:**
```typescript
// Linha 7-11: Cálculo ignora valor enviado
private static calculateAmount(childrenCount: number): number {
  if (childrenCount === 1) return 30;
  if (childrenCount === 2) return 40;
  return 50;
}
```

O `amount` do payload é ignorado. O valor é calculado por número de filhos.

**Problema em createRegional (linha 94-117):**
```typescript
const amountPerFamily = Math.floor(totalAmount / eligibleFamilies.length);
// Valor calculado mas NÃO usado
// Chama create() que recalcula pelo childrenCount
```

Resíduos de divisão são perdidos.

### 4.4 Módulo Families

| Arquivo | Estado | Problemas |
|---------|--------|-----------|
| families.routes.ts | OK | Faltando rotas awaiting-entity, assign-entity |
| families.controller.ts | OK | - |
| families.service.ts | MOCK | Usa (f as any).region |
| families.validator.ts | OK | - |

**Rotas faltando:**
- `GET /families/awaiting-entity` ✗
- `PATCH /families/:id/assign-entity` ✗

### 4.5 Módulo Indications

| Arquivo | Estado | Problemas |
|---------|--------|-----------|
| indications.routes.ts | OK | - |
| indications.controller.ts | OK | - |
| indications.service.ts | MOCK | Coordenadas com Math.random() |
| indications.validator.ts | OK | - |

**Problema em indications.service.ts (linha 66-67):**
```typescript
latitude: -23.612 + (Math.random() * 0.05),
longitude: -46.593 + (Math.random() * 0.05),
```
Coordenadas aleatórias, não seguem regra de jitter conhecido.

### 4.6 Módulo Ranking

| Arquivo | Estado | Problemas |
|---------|--------|-----------|
| ranking.routes.ts | OK | - |
| ranking.service.ts | OK | Lógica de anonimato funcional |

### 4.7 Módulo Regions

| Arquivo | Estado | Problemas |
|---------|--------|-----------|
| regions.routes.ts | OK | - |
| regions.service.ts | OK | Importa de camada errada |

**Problema em linha 2:**
```typescript
import { Family } from '../../../../src/backend/types';
```
Importa do frontend, não do backend.

---

## 5. ANÁLISE DO SEED

| Campo | Valor |
|-------|-------|
| Arquivo | `src/database/seed.ts` |
| Estado | Funcional para mock |
| Problema | Não cria entidades relacionadas |

**Usuários criados:**
- 1 admin
- 1 donor (doador@mealfy.com)
- 1 entity aprovada (entidade@mealfy.com)
- 1 entity pendente (entidadependente@mealfy.com)
- 1 beneficiary

**Famílias criadas:** 9 (3 regiões x 3 estados)

**Ausente:**
- Entity vinculada ao entity-user-1
- Entity vinculada ao entity-user-pending-1
- Doações de exemplo
- Vouchers de exemplo
- Indicações de exemplo

---

## 6. MATRIZ DE ROTAS

| Método | Rota | Auth | Roles | Payload | Service | Tabelas | Estado |
|--------|------|------|-------|---------|---------|---------|--------|
| POST | /auth/register/donor | Não | Público | name,email,documentType,documentNumber | AuthService.registerDonor | users | OK |
| POST | /auth/register/entity | Não | Público | name,email,cnpj,region,type | AuthService.registerEntity | users,entities | OK |
| POST | /auth/login/mock | Não | Público | email,password | AuthService.login | users | MOCK |
| GET | /auth/me | Sim | Qualquer | - | - | users | OK |
| PATCH | /auth/me/preferences | Sim | Qualquer | impactPreferences | AuthService.updatePreferences | users | OK |
| POST | /auth/register/beneficiary | - | - | - | - | - | - | FALTANDO |
| POST | /auth/login/firebase | - | - | - | - | - | - | FALTANDO |
| GET | /admin/entities/pending | Sim | admin | - | AdminService.listPendingEntities | users,entities | OK |
| PATCH | /admin/entities/:id/approve | Sim | admin | - | AdminService.approveEntity | users,entities | OK |
| PATCH | /admin/entities/:id/reject | Sim | admin | - | AdminService.rejectEntity | users | OK |
| GET | /admin/featured-donors | - | - | - | - | - | FALTANDO |
| PUT | /admin/featured-donors | - | - | - | - | - | FALTANDO |
| GET | /admin/donors | - | - | - | - | - | FALTANDO |
| POST | /donations | Sim | donor | familyId,amount | DonationsService.create | families,users,donations,giftcards | BUG* |
| POST | /donations/batch | Sim | donor | familyIds | DonationsService.createBatch | (múltiplas) | OK |
| POST | /donations/regional | Sim | donor | communityId,totalAmount | DonationsService.createRegional | (múltiplas) | BUG** |
| GET | /donations/me | Sim | donor | - | DonationsService.listMyDonations | donations,giftcards,families | OK |
| GET | /families/public | Não | Público | - | FamiliesService.getPublicFamilies | families | OK |
| GET | /families/:id | Sim | Qualquer | - | FamiliesService.getFamilyById | families | OK |
| POST | /families | Sim | entity,admin | schema completo | FamiliesService.createFamily | families | OK |
| PATCH | /families/:id/status | Sim | admin | status,supportStatus | FamiliesService.updateStatus | families | OK |
| GET | /families/awaiting-entity | - | - | - | - | - | FALTANDO |
| PATCH | /families/:id/assign-entity | - | - | - | - | - | FALTANDO |
| GET | /giftcards/ifood/info | - | - | - | - | - | FALTANDO |
| GET | /giftcards/family/:familyId | - | - | - | - | - | FALTANDO |
| GET | /giftcards/family/:familyId/active | - | - | - | - | - | FALTANDO |
| POST | /giftcards/:giftCardId/redeem | - | - | - | - | - | FALTANDO |
| GET | /indications | Sim | entity,admin | - | IndicationsService.listAll | indications | OK |
| POST | /indications | Sim | donor | schema | IndicationsService.create | indications | OK |
| PATCH | /indications/:id/status | Sim | admin | status | IndicationsService.updateStatus | indications | OK |
| POST | /indications/:id/convert | Sim | entity,admin | - | IndicationsService.convertToFamily | indications,families | OK |
| GET | /ranking | Não | Público | - | RankingService.getGlobalRanking | users | OK |
| GET | /regions | Não | Público | - | RegionsService.getRegions | families | OK |
| GET | /social/resolve/facebook | - | - | - | - | - | FALTANDO |
| GET | /social/resolve/facebook/:userId | - | - | - | - | - | FALTANDO |
| GET | /health | Não | Público | - | - | - | OK |
| GET | /health/ready | - | - | - | - | - | FALTANDO |

**BUG\*:** Valor `amount` do payload é ignorado, calculado por `childrenCount`

**BUG\*\*:** `amountPerFamily` calculado mas não usado; resíduos perdidos

---

## 7. REGRAS DE NEGÓCIO - VALIDAÇÃO

### 7.1 Cadastro de Doador

| Regra | Implementada | Observação |
|-------|--------------|------------|
| Email único | ✓ | Busca em JSON |
| role = donor | ✓ | Hardcoded |
| status = active | ✓ | Hardcoded |
| Preferências de privacidade | ✓ | Defaults aplicados |
| Firebase UID | ✗ | Não implementado |

### 7.2 Cadastro de Entidade

| Regra | Implementada | Observação |
|-------|--------------|------------|
| Email único | ✓ | Busca em JSON |
| CNPJ validado | ✗ | Apenas length check |
| status = pending | ✓ | Correto |
| Usuário vinculado | ✓ | entityId presente |
| Aprovação por admin | ✓ | Middleware roleGuard |

### 7.3 Cadastro de Beneficiário

| Regra | Implementada | Observação |
|-------|--------------|------------|
| Rota | ✗ | Não existe |
| CPF validado | ✗ | - |
| CPF único | ✗ | - |
| Família vinculada | ✗ | - |
| Coordenadas por região | ✗ | - |

### 7.4 Coordenadas (Geolocalização)

| Regra | Implementada | Observação |
|-------|--------------|------------|
| Jitter conhecido (-0.006 a +0.006) | ✗ | Usa Math.random() * 0.05 |
| Jitter desconhecido (-0.01 a +0.01) | ✗ | - |
| Centro de São Paulo | ✗ | Hardcoded -23.612, -46.593 |

### 7.5 Doações

| Regra | Implementada | Observação |
|-------|--------------|------------|
| Transação única | ✗ | Sem transação Prisma |
| Incrementar totalDonated | ✓ | Manual em JSON |
| Atualizar família | ✓ | supportStatus = fed |
| Criar voucher | ✓ | GiftCard gerado |
| Rollback em falha | ✗ | Sem transação |

### 7.6 Valores Monetários

| Regra | Implementada | Observação |
|-------|--------------|------------|
| Centavos inteiros | ✗ | Usa number |
| Tratar NaN | ✗ | Não validado |
| Tratar Infinity | ✗ | Não validado |
| Rejeitar negativos | ✗ | Não validado |
| Rejeitar zero | ✗ | Zod positive() usado |
| Resíduos de divisão | ✗ | Perdidos |

### 7.7 Ranking

| Regra | Implementada | Observação |
|-------|--------------|------------|
| Apenas donors | ✓ | Filtro por role |
| Ordenar por totalDonated | ✓ | Sort correto |
| showOnRanking | ✓ | Respeitado |
| anonymousMode | ✓ | Nome trocado |
| showInstagram | ✓ | Condicional |
| Dados sensíveis | ✓ | Não retornados |

### 7.8 Autorização

| Role | Rotas Permitidas |
|------|------------------|
| admin | /admin/*, /families/*, /indications/* |
| donor | /donations/*, /indications (POST), /auth/me |
| entity | /families (POST), /indications/* |
| beneficiary | Nenhuma específica |

---

## 8. PROBLEMAS CRÍTICOS ENCONTRADOS

### 8.1 Graves (Blockers)

1. **Sem Prisma/PostgreSQL** - Backend é mock puro
2. **Sem Firebase Auth** - Autenticação simulada via header
3. **Sem Transações ACID** - Operações distribuídas sem rollback
4. **Sem Testes** - Zero cobertura de testes
5. **Sem Git** - Não versionado
6. **Import de frontend** - regions.service.ts importa de src/backend/types

### 8.2 Médios

1. **Campo amount ignorado** - Doações calculam valor automaticamente
2. **Resíduos de divisão perdidos** - createRegional perde centavos
3. **Coordenadas aleatórias** - Não seguem regras de negócio
4. **Rotas faltando** ~10 endpoints não implementados
5. **Seed incompleto** - Não cria entidades/doações/vouchers

### 8.3 Menores

1. **any types** - Diversos usos de any
2. **Stack trace em produção** - errorHandler retorna detalhes
3. **Sem paginação** - Todas as listas retornam tudo
4. **Sem rate limiting** - APIs sem proteção
5. **Sem validação de CNPJ/CPF** - Apenas length check

---

## 9. EXECUÇÃO DOS COMANDOS

### 9.1 Install e Build

```bash
cd backend
npm install    # OK - 5 pacotes instalados
npm run build  # OK - TypeScript compila
```

### 9.2 Prisma Commands

```bash
npm run prisma:generate  # ERRO - Prisma não instalado
npx prisma format        # ERRO - Prisma não instalado
npx prisma validate      # ERRO - Prisma não instalado
npx prisma migrate *     # ERRO - Prisma não instalado
```

### 9.3 Tests

```bash
npm run test  # ERRO - Script não definido
```

### 9.4 Lint

```bash
npm run lint  # ERRO - Script não definido
```

### 9.5 Seed

```bash
npm run seed  # OK - Popula arquivos JSON
```

### 9.6 Dev Server

```bash
npm run dev   # OK - Servidor inicia na porta 3000
```

---

## 10. CONCLUSÃO

### O que funciona (protótipo)

- API Express funcional
- Validação com Zod
- Middlewares de auth/role
- CRUD básico em JSON
- Rotas principais documentadas
- Seed de dados básicos

### O que NÃO existe

- Prisma ORM
- PostgreSQL
- Firebase Authentication
- Migrations
- Testes automatizados
- Transações ACID
- Validação real de documentos
- Integração com iFood/vouchers
- Controle de versão Git

### Próximos Passos Necessários

1. Inicializar repositório Git
2. Instalar e configurar Prisma
3. Criar schema.prisma completo
4. Implementar migrations
5. Configurar Firebase Admin
6. Criar testes unitários e de integração
7. Corrigir bugs de negócio
8. Implementar rotas faltantes

---

**Status Final:** REPROVADO para produção. Backend é um protótipo mock que requer reimplementação completa com Prisma/PostgreSQL/Firebase.
