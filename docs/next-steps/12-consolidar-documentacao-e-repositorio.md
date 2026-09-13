# Consolidar documentação e repositório

- **Prioridade:** média.
- **Objetivo:** remover ambiguidade entre arquitetura atual e scaffolds antigos.
- **Contexto técnico:** README raiz é template; `backend/ARCHITECTURE.md` descreve MockDatabase, enquanto `backend/README.md` declara Prisma/PostgreSQL e considera documentos antigos obsoletos; outputs Android estão rastreados.
- **Escopo:** README, docs de arquitetura/deploy, inventário de mocks, ignore e limpeza de outputs.
- **Áreas afetadas:** `README.md`, `backend/*.md`, `docs/`, `.gitignore`, arquivos Android gerados.
- **Passos:** eleger documentos canônicos; arquivar/rotular obsoletos; documentar comandos/environments; remover outputs rastreados sem apagar fonte Android.
- **Dependências/pré-requisitos:** decisões técnicas das tarefas anteriores.
- **Critérios de aceite:** onboarding não confunde mock frontend com backend; documentação descreve somente estado atual; git não contém build cache.
- **Riscos e validações:** preservar migrations e arquivos-fonte; revisar links internos após renomear/arquivar.
