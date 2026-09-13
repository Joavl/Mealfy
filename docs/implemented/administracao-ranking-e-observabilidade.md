# Administração, ranking e observabilidade

## Estado: implementado parcialmente

## Administração e ranking reais no backend

O backend fornece rotas administrativas para moderação, logs, usuários, estoque de vales e ranking, sob `backend/src/modules/admin/**`, `giftCards/**` e `ranking/**`.

O ranking possui modelo persistido `RankingStory` com doador e posição únicos (`backend/prisma/schema.prisma:203-214`) e migration `20260820000000_add_persisted_ranking_stories`.

O frontend possui `AdminDashboard.tsx`, `adminApi.ts` e uma seção de stories. O contexto também busca ranking público por `rankingService.getTopDonors()` (`src/context/AppContext.tsx:52-56`).

## Estado local ainda presente no painel

`src/hooks/useAdminData.ts` inicia entidades, famílias e usuários com seeds e `localStorage` (`:58-104`). O hook tenta carregar API, mas, quando falha, mantém os seeds (`:115-154`). Alterações são otimistas e algumas continuam somente locais:

- mutações são disparadas sem aguardar confirmação, mantendo o estado local se a API falhar (`:160-179`);
- alterar status ou papel de usuário é explicitamente local-only por falta de rota backend (`:181-189`).

Logo, a interface existe, mas não pode ser tratada como painel operacional confiável enquanto os endpoints e a confirmação/rollback não forem concluídos.

## Auditoria e alertas

O schema contém `AuditLog` (`backend/prisma/schema.prisma:599-610`) e há serviço de logs. Porém `backend/src/shared/alerts/alert.service.ts:57` mantém TODO explícito para encaminhar alertas a Sentry/Slack. Não foi encontrada evidência de logging estruturado, APM ou alertas operacionais configurados.

## Bloqueio técnico do ranking

O typecheck backend falha em `backend/src/modules/ranking/ranking.service.ts:64` porque o input de `createMany` não satisfaz o tipo atual de `RankingStoryCreateManyInput`. Assim, a funcionalidade tem estrutura e persistência, mas o gate de compilação está reprovado.
