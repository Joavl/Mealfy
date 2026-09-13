# Restaurar build, typecheck e lint

- **Prioridade:** crítica — bloqueia produção.
- **Objetivo:** fazer os gates estáticos passarem e impedir regressão.
- **Contexto técnico:** build falha em `src/pages/Profile.tsx:41`; typecheck backend em `backend/src/modules/ranking/ranking.service.ts:64`; lint inclui artefatos gerados pois `eslint.config.js` ignora apenas `dist`.
- **Escopo:** corrigir tipos/imports e contrato do ranking; ignorar outputs Android; resolver erros reais de lint.
- **Áreas afetadas:** `src/pages/Profile.tsx`, `backend/src/modules/ranking/`, `eslint.config.js`, `.gitignore`, arquivos Android gerados.
- **Passos:** reproduzir em instalação limpa; corrigir cada bloqueio; separar source de outputs; executar build/lint/typecheck novamente; registrar comandos no CI.
- **Dependências/pré-requisitos:** Node e lockfiles instaláveis.
- **Critérios de aceite:** `npm run build`, `npm run lint` e `cd backend && npm run typecheck` retornam sucesso sem suprimir regras indiscriminadamente.
- **Riscos e validações:** tipos corrigidos podem revelar contratos quebrados; validar ranking e perfil manualmente e por teste.

## Gate local de pré-commit

O repositório versiona o hook em `.githooks/pre-commit`. Após instalar as dependências da raiz e do backend, execute `npm run hooks:install`. O instalador configura localmente o caminho relativo `core.hooksPath=.githooks`, que funciona também em worktrees vinculados.

Antes de cada commit, o hook executa `npm run precommit` (alias de `npm run quality:check`), que exige sucesso em `npm run lint`, `npm run build` e `npm --prefix backend run typecheck`. Se qualquer comando falhar, o commit é cancelado. O CI deve executar `npm run precommit` como check obrigatório, pois hooks locais podem ser ignorados com `--no-verify`.
