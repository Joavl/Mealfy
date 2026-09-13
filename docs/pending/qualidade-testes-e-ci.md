# Qualidade, build, testes e CI

## Prioridade: crítica

## Objetivo

Restabelecer uma cadeia verificável de compilação, análise estática e testes antes de qualquer entrega.

## Estado observado

- `npm run build` falha: `src/pages/Profile.tsx:41` usa `User['role']` sem importação de `User`.
- `cd backend && npm run typecheck` falha: `backend/src/modules/ranking/ranking.service.ts:64` envia dados incompatíveis a `RankingStoryCreateManyInput`.
- `npm run lint` falha com 111 erros e 5 avisos; `eslint.config.js:9` ignora somente `dist`, portanto inclui `android/.gradle/**` e `android/app/build/**`.
- Não existem scripts `test` ou `coverage` em `package.json` ou `backend/package.json`; cobertura não é mensurável.
- Workflows existentes compilam Android/iOS, mas não executam os gates acima.

## Escopo

1. Corrigir os erros de TypeScript que impedem build e typecheck.
2. Excluir outputs gerados do lint e resolver os diagnósticos de código-fonte restantes, sem simplesmente desativar regras úteis.
3. Adicionar testes unitários, integração e E2E para regras críticas.
4. Criar CI com instalação reprodutível, lint, typecheck de cliente e backend, testes, cobertura, build e auditoria de dependências.

## Requisitos funcionais e não funcionais

- Nenhum merge de release pode ocorrer com build/typecheck/lint reprovado.
- Testes devem cobrir autorização, erro de rede em Pix, webhook idempotente, liberação única de vale, limite diário e exposição de PII.
- O relatório de cobertura deve ser produzido e o limiar só deve ser exigido após a ferramenta estar configurada; a meta solicitada é superior a 80%.

## Critérios de aceite

- `npm run build`, `npm run lint` e `cd backend && npm run typecheck` passam em ambiente limpo.
- Testes são executados pelos scripts documentados e pelo CI.
- CI bloqueia falhas e publica cobertura.
- Artefatos Android gerados não são analisados nem versionados como fonte.

## Riscos e dependências

Correções de tipo podem expor contratos API inconsistentes; devem ser acompanhadas de testes. A auditoria de dependências deve ser reproduzida via `npm ci` e `npm audit --omit=dev` em cada projeto antes de alegar vulnerabilidade específica.
