# Administração e sincronização com API

## Prioridade: alta

## Objetivo

Tornar o painel administrativo uma interface operacional baseada exclusivamente em resposta confirmada do backend.

## Estado observado

`src/hooks/useAdminData.ts` usa seeds e `localStorage`; carrega API quando disponível, mas mantém dados locais na falha. Mutações são otimistas/fire-and-forget. Mudança de status e papel de usuário é explicitamente local-only por ausência de endpoint (`:181-189`).

O backend tem módulos administrativos e de ranking, mas o typecheck de ranking está reprovado em `backend/src/modules/ranking/ranking.service.ts:64`.

## Escopo

- Inventariar ações mostradas no painel e associar cada uma a endpoint server-side autorizado.
- Implementar endpoints ausentes de status/papel ou retirar os controles da UI.
- Aguardar confirmação de mutações ou aplicar rollback, erro visível e recarregamento autoritativo.
- Remover seeds/fallback do build de produção.
- Corrigir contrato Prisma do ranking e adicionar testes de ordenação e elegibilidade.

## Critérios de aceite

- Nenhuma ação administrativa mostra sucesso sem confirmação HTTP válida.
- Falha não mantém alteração visual como se estivesse persistida.
- Usuários, famílias, entidades, estoque e ranking são carregados da API e têm estados vazios/erro distintos de dados demo.
- Controle de status/papel é auditado e protegido por administrador no backend.

## Riscos

Mudanças de papel podem afetar autorização e tokens existentes; a especificação deve definir revogação/renovação de sessão de modo coerente com a tarefa de autenticação.
