# Notas de Auditoria - Mealfy Backend

Este documento serve para guiar o auditor técnico sobre as decisões tomadas.

## Segurança e Guards
- **Role Guards**: Todas as rotas sensíveis são protegidas pelo middleware `roleGuard`.
- **Region Guards**: A conversão de indicações por entidades exige que a região da família seja compatível com a região da entidade.
- **Pending Guard**: Entidades com status `pending` são bloqueadas de qualquer ação de escrita que exija confiança (cadastro e conversão).

## Consistência de Dados
- **Conversão Única**: O status `converted` em uma indicação impede que ela gere múltiplos beneficiários.
- **Visibilidade**: A função `isPubliclyVisibleFamily` garante que famílias suspensas ou pendentes não sejam expostas.

## Audit Logs
Todos os eventos significativos (Registro, Doação, Aprovação, Conversão) geram uma entrada no `audit-logs.json` com timestamp e IDs envolvidos.
