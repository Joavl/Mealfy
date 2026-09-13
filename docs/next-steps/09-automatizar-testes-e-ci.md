# Automatizar testes, SCA e CI

- **Prioridade:** alta.
- **Objetivo:** transformar regras de negócio e segurança em gates repetíveis.
- **Contexto técnico:** não há scripts de teste/cobertura; workflows só compilam mobile.
- **Escopo:** framework de testes, banco de integração, cobertura, SCA e pipeline.
- **Áreas afetadas:** ambos `package.json`, workflows GitHub, backend Prisma/testes, frontend/pages/API.
- **Passos:** escolher ferramentas compatíveis; criar fixtures isoladas; cobrir Pix/webhook, limite diário, autorização e rede; adicionar `npm audit --omit=dev`; publicar cobertura; fixar Actions por SHA.
- **Dependências/pré-requisitos:** gates de qualidade restaurados.
- **Critérios de aceite:** CI instala com lockfile, executa qualidade/testes/audit/build e bloqueia falhas; cobertura é mensurada.
- **Riscos e validações:** testes financeiros devem usar provider e banco de teste, jamais segredos/produção.
