# Persistir perfil, favoritos e preferências

- **Prioridade:** alta.
- **Objetivo:** evitar divergência entre dispositivo e fonte de verdade.
- **Contexto técnico:** `AppContext.tsx` mantém favoritos, preferências e atualizações otimistas em storage; algumas não são modeladas no backend.
- **Escopo:** contratos API/schema necessários, persistência remota e rollback/erro visível.
- **Áreas afetadas:** `src/context/AppContext.tsx`, `src/api/usersApi.ts`, backend users/favorites, Prisma e perfil.
- **Passos:** inventariar campos; modelar endpoints; migrar dados quando necessário; remover escrita local como fonte final; implementar feedback de sincronização.
- **Dependências/pré-requisitos:** autorização e política de privacidade definidas.
- **Critérios de aceite:** perfil e preferências são consistentes em nova sessão/dispositivo; falha não aparece como sucesso.
- **Riscos e validações:** proteger configurações de privacidade e não expor favoritos/PII.
