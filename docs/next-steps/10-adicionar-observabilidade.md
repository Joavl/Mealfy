# Adicionar observabilidade e controles operacionais

- **Prioridade:** alta.
- **Objetivo:** detectar e investigar falhas críticas sem vazar dados sensíveis.
- **Contexto técnico:** há healthcheck e audit log, mas `alert.service.ts` tem TODO para Sentry/Slack.
- **Escopo:** logs estruturados, exceções, métricas, alertas e runbooks básicos.
- **Áreas afetadas:** backend app/middlewares/alerts, pagamentos, gift cards, Docker/deploy e documentação.
- **Passos:** definir eventos; sanitizar campos; integrar ferramenta; criar alertas para webhook/pagamento/estoque/banco; testar simulações.
- **Dependências/pré-requisitos:** conta e credenciais do serviço de observabilidade.
- **Critérios de aceite:** falha crítica produz alerta; logs correlacionam requisição sem token/código/PII desnecessária.
- **Riscos e validações:** não registrar dados de pagamento, vales ou segredo em telemetria.
