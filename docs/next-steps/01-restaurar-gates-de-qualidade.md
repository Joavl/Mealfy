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
