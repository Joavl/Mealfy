# Concluir ou ocultar fluxos mockados

- **Prioridade:** alta.
- **Objetivo:** alinhar a interface ao que é realmente executado pelo backend.
- **Contexto técnico:** lote/regional, apoio ampliado, recorrência, reset, OAuth UI, beneficiary e NIS/Gov.br têm simulações ou ausência de integração.
- **Escopo:** para cada fluxo, implementar ponta a ponta ou removê-lo/ocultá-lo em produção.
- **Áreas afetadas:** `BigDonation.tsx`, `Recurrence.tsx`, `DonationChoice.tsx`, `Auth.tsx`, serviços mock e rotas backend.
- **Passos:** inventariar CTA e endpoint; definir contrato; implementar persistência/testes ou feature flag segura; remover resultados/códigos falsos.
- **Dependências/pré-requisitos:** gateway, provider e credenciais aplicáveis.
- **Critérios de aceite:** nenhuma tela declara sucesso de ação inexistente; todo CTA operacional tem backend e erro tratável.
- **Riscos e validações:** alterações podem mudar expectativa de produto; validar rotas e mensagens com responsáveis.
