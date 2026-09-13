# Famílias, entidades e regiões

## Estado: implementado parcialmente

## Backend real

O schema Prisma modela entidades, famílias, dependentes, regiões e comunidades (`backend/prisma/schema.prisma:216-408`). Há migrations versionadas sob `backend/prisma/migrations/`.

Funcionalidades existentes:

- entidade autenticada consulta dashboard e famílias próprias e pode criar/editar famílias por `/entity/*` (`backend/src/modules/entities/entities.routes.ts`);
- rotas genéricas para listagem, detalhe, mapa, criação, edição, aprovação, rejeição, bloqueio e solicitação diária de apoio (`backend/src/modules/families/families.routes.ts`);
- moderação exclusiva de admin para aprovar/rejeitar/bloquear;
- solicitação diária admite `beneficiary`, `entity` e `admin`, com comentário explícito de que o serviço deve validar o vínculo;
- regra de dependente elegível de 0 a 17 anos e status de aprovação é modelada e documentada no backend;
- `Region` usa código IBGE e `Community` registra origem de geocodificação no schema.

## Cliente existente

- telas para explorar famílias, mapa, detalhes, cadastro e indicação: `Explore.tsx`, `MapView.tsx`, `FamilyDetails.tsx`, `RegisterFamily.tsx`, `IndicateFamily.tsx`;
- serviços API-first para famílias, com fallback de desenvolvimento: `src/backend/services/familyService.ts`;
- região selecionada e comunidades são carregadas no contexto: `src/context/AppContext.tsx:58-72`.

## Limitações

- `RegisterFamily.tsx:142-143` gera coordenadas com `Math.random()` no fluxo identificado pelo lint; isso não é geolocalização confiável.
- O mapa apresenta detalhes de famílias; a minimização de dados precisa ser garantida no DTO e autorização de backend, não somente no frontend.
- Beneficiários não são excluídos nas rotas genéricas `/families`, `/families/map` e `/families/:id`; a listagem para papéis não gerenciais retorna famílias aprovadas. Isto é risco de autorização documentado em [autorização, privacidade e consistência](../pending/autorizacao-privacidade-e-consistencia.md).
- Entidades pendentes recebem JWT de role `entity`, e as rotas de entidade verificam papel, não aprovação. Isto precisa ser corrigido antes da operação real.
