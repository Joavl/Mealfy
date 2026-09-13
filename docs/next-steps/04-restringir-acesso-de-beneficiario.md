# Restringir acesso de beneficiário a famílias

- **Prioridade:** crítica — bloqueia produção.
- **Objetivo:** impedir consulta de famílias não vinculadas.
- **Contexto técnico:** `/families`, `/families/map` e `/:id` exigem autenticação mas não excluem `beneficiary`.
- **Escopo:** política server-side por vínculo e DTO mínimo específico.
- **Áreas afetadas:** `backend/src/modules/families/{routes,service,controller,dto}.ts`, testes de API, `MapView`/detalhes conforme contrato.
- **Passos:** decidir bloqueio ou filtro por `beneficiaryUserId`; ajustar consultas/DTOs; criar testes de enumeração e acesso direto por ID.
- **Dependências/pré-requisitos:** vínculo família-beneficiário existente na migration/schema.
- **Critérios de aceite:** beneficiário não lista, mapeia ou lê outra família; papéis autorizados preservam dados necessários.
- **Riscos e validações:** evitar regressão na solicitação diária do beneficiário, que precisa continuar validando o vínculo.
