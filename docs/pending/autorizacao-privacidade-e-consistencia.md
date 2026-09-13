# Autorização, privacidade e consistência

## Prioridade: alta

## Objetivo

Aplicar autorização server-side por vínculo e reduzir exposição de dados de famílias, além de evitar divergência entre estado exibido e fonte de verdade.

## Estado observado

- `backend/src/modules/families/families.routes.ts:10-14` aplica apenas autenticação às rotas genéricas.
- O comentário diz que papéis não gerenciais recebem famílias aprovadas; beneficiário não é excluído.
- O serviço/DTO de mapa expõe dados de família aprovada, incluindo contexto de localização aproximada conforme auditoria do código.
- `src/pages/MapView.tsx` renderiza coordenadas e campos de contexto; controles de UI não são autorização.
- `src/context/AppContext.tsx:178-235` atualiza perfil/privacidade localmente e, se a API falha, apenas emite `console.warn`.
- Coordenadas de novo cadastro podem ser aleatórias em `RegisterFamily.tsx:142-143`.

## Escopo

- Política explícita por papel para listagem, mapa e detalhe de família.
- DTO próprio para beneficiário com vínculo `family.beneficiaryUserId === req.auth.userId`, ou bloqueio completo das rotas genéricas para este papel.
- Minimização e desfocagem server-side de dados de localização/detalhe para doadores.
- Persistência remota de preferências/favoritos ou indicação visível de estado não sincronizado/rollback.
- Remoção de coordenadas aleatórias; origem e precisão devem ser claras.

## Critérios de aceite

- Beneficiário autenticado não consegue enumerar nem consultar família não vinculada.
- APIs não enviam PII/localização exata a papéis não autorizados.
- Falha de perfil ou privacidade é percebida pelo usuário e não deixa sucesso falso local.
- Testes de autorização exercitam cada papel e recurso.

## Riscos e dependências

Mudanças de DTO podem exigir adaptação de mapa e detalhes. A definição jurídica de minimização e consentimento não está no código e deve ser fornecida pelo responsável, mas o backend deve restringir os dados tecnicamente.
