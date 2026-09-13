# Sincronizar administração com API

- **Prioridade:** alta.
- **Objetivo:** eliminar seeds e mutações locais enganosas no painel.
- **Contexto técnico:** `useAdminData.ts` faz fallback para seeds e status/role de usuário são local-only.
- **Escopo:** endpoints ausentes, confirmação/rollback, carregamento autoritativo e correção do ranking.
- **Áreas afetadas:** `src/hooks/useAdminData.ts`, `AdminDashboard.tsx`, `src/api/adminApi.ts`, módulos admin/users/ranking do backend.
- **Passos:** mapear ações; implementar contratos protegidos/auditados; substituir fire-and-forget por confirmação; tratar loading/erro/vazio; corrigir typecheck ranking.
- **Dependências/pré-requisitos:** tarefa de qualidade concluída.
- **Critérios de aceite:** nenhum sucesso local sem HTTP confirmado; alterações de usuário são persistidas e auditadas.
- **Riscos e validações:** alteração de role precisa coordenar com ciclo de sessão e autorização.
