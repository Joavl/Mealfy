# Endurecer autenticação e entidades pendentes

- **Prioridade:** crítica — bloqueia produção.
- **Objetivo:** remover senha fixa/mock e impedir operação por entidade não aprovada.
- **Contexto técnico:** `registerEntity()` envia `123456`; entidade pendente recebe JWT; `/entity` verifica somente role.
- **Escopo:** ativação segura, reset real, sessão segura e gate de status/entidade.
- **Áreas afetadas:** `src/backend/services/authService.ts`, `backend/src/modules/auth/**`, `entities/**`, middleware, schema/migrations e e-mail.
- **Passos:** definir convite ou senha inicial; remover mock local; validar status em middleware/serviço; implementar reset com token expirável; testar sessão.
- **Dependências/pré-requisitos:** provider de e-mail e política de token.
- **Critérios de aceite:** não há senha hard-coded; entidade pending não cria/edita famílias; reset é seguro e auditável.
- **Riscos e validações:** revogar sessão após mudança de status; testar donor/entity/beneficiary/admin e tokens expirados.
