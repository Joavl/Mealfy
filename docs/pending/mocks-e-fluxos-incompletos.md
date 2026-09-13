# Remoção de mocks e fluxos incompletos

## Prioridade: alta

## Objetivo

Evitar que telas anunciadas como produto executem simulações, seeds ou operações locais quando a API não dá suporte correspondente.

## Itens observados

| Fluxo | Estado verificável | Evidência |
|---|---|---|
| Apoio em lote/regional | Cliente declara mock-only; sem rota backend | `src/api/donationsApi.ts:94-99` |
| Apoio ampliado | Simula atraso, resultado e código | `src/pages/BigDonation.tsx:31-62` |
| Recorrência | Lista e mutações apenas em estado local/timeout | `src/pages/Recurrence.tsx:21-100` |
| Reset de senha | Mock | `src/backend/services/authService.ts:142-146` |
| Login Google/Gov.br visual | Mock/modal ou SDK não conectado | `src/backend/services/authService.ts:131-140`, componentes mock |
| Cadastro beneficiary | Mock local | `src/backend/services/authService.ts:149-155` |
| CadÚnico/Gov.br/NIS | Há modal e lógica simulada; não há consulta institucional comprovada | `GovBrMockModal.tsx`, `RegisterFamily.tsx` |
| Perfil público | Usa dados mock locais | `src/pages/Profile.tsx` e serviços mock |
| Beneficiário | Há caminhos de fallback visual/local a revisar | `src/pages/BeneficiaryDashboard.tsx` |

## Escopo

Para cada item, escolher uma das alternativas sustentadas pelo produto: implementar backend + cliente + testes; manter explicitamente como ambiente de desenvolvimento; ou remover/ocultar da produção. Não tratar stubs como integração externa concluída.

## Critérios de aceite

- Produção não expõe mock, código de vale fictício, sucesso financeiro local ou ação que não persista.
- Todo botão de operação chama endpoint existente, trata falha e mostra resultado autoritativo.
- Itens juridicamente dependentes, como NIS/Gov.br, permanecem declarados como não integrados até existir base técnica e credencial correspondente.

## Dependências

As integrações reais requerem contratos de API, modelo de dados, provider externo quando aplicável e testes. A mera existência de enum/provider stub não satisfaz a pendência.
