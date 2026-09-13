# Funcionalidades implementadas

Este diretório registra comportamentos verificáveis na branch analisada. **Implementado parcialmente** significa que existe código funcional, mas ainda há dependência externa, mock, fallback local, erro de qualidade ou escopo incompleto. Não equivale a pronto para produção.

## Índice

- [Aplicativo, rotas e perfis](aplicativo-rotas-e-perfis.md)
- [Autenticação, usuários e OAuth](autenticacao-usuarios-e-oauth.md)
- [Famílias, entidades e regiões](familias-entidades-e-regioes.md)
- [Doações, pagamentos e vales](doacoes-pagamentos-e-vales.md)
- [Administração, ranking e observabilidade](administracao-ranking-e-observabilidade.md)
- [Plataforma, build e entrega](plataforma-build-e-entrega.md)

## Convenções de evidência

- Caminhos e linhas citados apontam para o estado atual do repositório.
- `src/backend/` é uma camada de serviços do frontend, incluindo mocks e `localStorage`; não é o backend Express real, que fica em `backend/`.
- O estado dos comandos foi verificado nesta análise: `npm run build`, `npm run lint` e `cd backend && npm run typecheck` falharam. Detalhes em [pendências de qualidade](../pending/qualidade-testes-e-ci.md).
