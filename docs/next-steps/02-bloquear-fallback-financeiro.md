# Bloquear fallback financeiro e benefícios fictícios

- **Prioridade:** crítica — bloqueia produção.
- **Objetivo:** impedir vale, família atendida ou sucesso sem confirmação autoritativa.
- **Contexto técnico:** `DonationChoice.tsx:113-183` segue para mock após `ApiNetworkError`.
- **Escopo:** abortar falha de rede; distinguir estado desconhecido de sucesso; remover fluxo local de vales/doações de produção.
- **Áreas afetadas:** `src/pages/DonationChoice.tsx`, `Success.tsx`, serviços de doação/família/gift card, testes.
- **Passos:** mapear caminhos de falha; retornar UI de retry/consulta; garantir que apenas webhook/backend mude estado; testar offline e 5xx.
- **Dependências/pré-requisitos:** endpoint de consulta de pagamento/doação funcional.
- **Critérios de aceite:** nenhuma falha de rede mostra código, conclusão ou altera família localmente.
- **Riscos e validações:** risco financeiro; executar testes de integração de Pix e teste manual com API indisponível.
