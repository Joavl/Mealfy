# Pix direto ao responsável familiar

**Status:** aprovado para detalhamento e implementação futura
**Decisão relacionada:** [ADR 0001 — Pix direto ao responsável familiar](../adr/0001-pix-direto-responsavel-familiar.md)
**Escopo deste documento:** requisitos funcionais, arquitetura, estados, permissões, dados, contratos, migração, testes e lançamento. Este documento não autoriza uso de dados reais antes dos gates jurídicos e operacionais.

## 1. Objetivo

Substituir, para novas doações destinadas a famílias, o fluxo “gateway da plataforma → confirmação por webhook → vale-presente” por um fluxo em que o doador envia um Pix diretamente ao responsável familiar.

A Mealfy fornece contexto, gera um BR Code estático com valor e registra declarações humanas. Ela **não recebe, custodia, liquida nem confirma financeiramente** a transferência.

## 2. Princípios não negociáveis

1. Somente uma chave aleatória Pix (EVP) do responsável familiar adulto pode ser usada.
2. Validar UUID prova somente formato; não prova registro, atividade ou titularidade no DICT.
3. O aplicativo bancário do doador é a fonte autoritativa do nome exibido antes da transferência.
4. “Já realizei o Pix” é uma declaração do doador, não confirmação bancária.
5. “Recebimento confirmado pela família” é uma declaração do responsável, não verificação da Mealfy.
6. Nenhum estado, texto ou métrica do novo fluxo pode dizer ou insinuar “pagamento verificado”.
7. Autodeclarações não alimentam recibos fiscais, ranking, metas nem totais financeiros confirmados.
8. O backend é autoritativo para valor, chave revisada, BR Code, estados, prazos e autorização.
9. Chave, QR e nome civil completo nunca entram em URL, log, trace, analytics, auditoria ou notificação.
10. O novo agregado é separado de Donation/Payment/GiftCard. Não haverá dual-write nem reinterpretação de estados legados.
11. Falha de autorização, criptografia, flag ou consistência torna o Pix indisponível (fail closed).
12. Um QR estático copiado pode continuar pagável enquanto a EVP permanecer ativa no DICT; a Mealfy não pode revogá-lo remotamente.

## 3. Escopo

### 3.1 Incluído

- vínculo exclusivo entre família e responsável;
- cadastro, confirmação, revisão, ativação, suspensão, troca e revogação de EVP;
- revisão presencial sem retenção de comprovante bancário;
- sessão autenticada para revelar QR/copia-e-cola;
- BR Code estático com valor fixo;
- declaração, cancelamento e declaração tardia pelo doador;
- confirmação familiar e atendimento assistido;
- divergências, acompanhamento e resolução administrativa;
- ciclo diário às 08:00 em America/Sao_Paulo;
- e-mail verificado, autenticação reforçada e OTP;
- notificações, jobs, auditoria, flags e kill switch;
- exportação, anonimização e retenção;
- migração e preservação de histórico legado.

### 3.2 Fora do MVP

- consulta direta da Mealfy ao DICT;
- promessa de validação bancária da chave;
- webhook de liquidação;
- custódia, repasse, estorno ou chargeback pela Mealfy;
- comprovantes, extratos ou screenshots;
- chat ou contato direto entre doador e família;
- Pix agendado, recorrente, coletivo ou regional;
- CPF, telefone ou e-mail como chave;
- recibo fiscal;
- ranking ou meta baseada em declaração;
- funcionamento offline, download ou compartilhamento do QR;
- WhatsApp/SMS no MVP.

## 4. Situação atual e decisão de arquitetura

O backend atual modela Payment, PaymentEvent, Donation, GiftCard e GiftCardOrder para uma cobrança recebida pela plataforma e fulfillment de vale. Esses modelos possuem semântica incompatível com Pix direto.

Será criado um módulo profundo de Pix direto. Sua interface externa concentra as operações de responsável, chave, intenção, revelação, declaração, confirmação e acompanhamento. Criptografia, BR Code, relógio/ciclo, idempotência, auditoria e outbox são dependências internas; callers não montam payload financeiro nem fazem transições de estado diretamente.

O legado permanece legível e encerra obrigações já iniciadas. As rotas de criação legadas serão desabilitadas no corte e posteriormente removidas.

## 5. Papéis e identidade

### 5.1 Doador

Para criar uma intenção ou revelar o Pix, precisa:

- conta ativa autenticada;
- e-mail verificado;
- aceite vigente dos termos específicos;
- confirmação explícita de que conferirá nome e valor no banco.

A família o identifica apenas por código neutro, por exemplo “Doador A7F2”. Não recebe nome, e-mail ou telefone.

### 5.2 Responsável familiar

- existe exatamente um responsável ativo por família;
- uma conta de responsável representa exatamente uma família;
- é o único titular admitido para a EVP;
- administra sua chave e responde sobre recebimentos;
- usa autenticação recente (até 15 minutos) ou step-up por senha e OTP nas ações sensíveis.

### 5.3 Entidade

Dentro de suas próprias famílias, pode:

- convidar ou indicar o responsável;
- cadastrar a chave em atendimento assistido, sujeito à confirmação do responsável;
- executar revisão presencial se não tiver submetido a versão;
- registrar a resposta obtida do responsável, identificando declarante e operador;
- atender exceções simples conforme política.

Não pode aprovar a própria submissão, declarar pelo doador ou presumir resposta da família.

### 5.4 Admin e funções privilegiadas

Permissões internas separadas devem cobrir revisão, acompanhamento, auditoria, incidente e configuração. Admins veem dados mascarados por padrão. Revelação integral administrativa é break-glass, com step-up, propósito, tempo limitado e auditoria.

## 6. Jornada funcional

### 6.1 Vínculo e convite

1. Entidade/admin seleciona uma família aprovada.
2. Envia convite ao responsável.
3. O responsável ativa a conta, verifica e-mail e confirma o vínculo.
4. O sistema garante uma família por conta e um responsável por família.
5. Famílias/vínculos ambíguos entram em saneamento; o sistema nunca escolhe o primeiro registro automaticamente.
6. Até concluir o vínculo e ativar a chave, o estado público é “Doações indisponíveis no momento”.

### 6.2 Cadastro e revisão da EVP

1. O responsável submete a EVP ou a entidade a digita em atendimento assistido.
2. O servidor normaliza para UUID canônico em minúsculas e recusa CPF, telefone, e-mail ou formato inválido.
3. Submissão assistida começa aguardando confirmação do responsável.
4. Toda versão confirmada entra em “Aguardando revisão”.
5. Na revisão presencial, o responsável abre a área de chaves do banco e o revisor compara EVP e nome.
6. Não se retêm screenshot, CPF, agência, conta, saldo nem resposta bruta de PSP/DICT.
7. Registra-se revisor, instante, resultado, nome esperado, versão e motivo estruturado.
8. Aprovada, torna-se “Revisada presencialmente” e ativa. Rejeitada, fica imutável; correção cria nova versão.
9. Casos de risco exigem segundo aprovador: chave usada em outra família, diferença relevante de nome, troca recente de responsável, denúncia anterior, repetidas rejeições ou reativação após incidente.

### 6.3 Escolha do valor e intenção

- sugestões: R$ 25, R$ 50, R$ 100 e R$ 200;
- personalizado: mínimo R$ 5 e máximo R$ 1.000 por tentativa;
- sem teto diário adicional por doador;
- valor é revisto antes da revelação;
- criar ou revelar QR não reserva a família;
- várias intenções podem coexistir até a primeira declaração de envio;
- a primeira declaração congela a coorte: somente intenções que já tiveram o Pix revelado e cujo grant ainda estava válido naquele instante mantêm o caminho normal para declarar;
- intenção criada mas nunca revelada, ou revelada somente depois do bloqueio, não pertence à coorte.

### 6.4 Revelação do Pix

1. O backend verifica elegibilidade, versão ativa da chave, flags e termos.
2. Cria token de revelação de uso restrito, armazenando apenas hash.
3. Por até 15 minutos, retorna com Cache-Control: no-store:
   - QR;
   - Pix copia-e-cola;
   - valor;
   - nome civil esperado;
   - aviso de comparação com o banco.
4. Não oferece chave isolada, download ou compartilhamento.
5. O cliente não persiste resposta em localStorage, IndexedDB, cache/service worker ou analytics.

Texto mínimo antes da revelação:

> O Pix será enviado diretamente ao responsável. A Mealfy não recebe nem confirma o dinheiro. Confira no seu banco o nome do titular e o valor. Não conclua se houver diferença.

### 6.5 Declaração do doador

- disponível no fluxo normal até 24 horas após a criação da intenção;
- operação idempotente por intenção;
- a primeira declaração do ciclo bloqueia novas intenções e novas revelações para a família;
- intenções da coorte congelada ainda podem declarar até seu prazo individual de 24 horas;
- um Pix feito a partir de QR salvo que não pertença à coorte usa o fluxo excepcional de código anterior;
- cada declaração recebe código neutro próprio e deve ser confirmada separadamente;
- o doador pode cancelar antes da confirmação, com motivo estruturado;
- se todas as declarações forem canceladas/resolvidas como não recebidas, a operação pode reabrir o ciclo após decisão válida;
- depois de 24 horas, usa “Pix realizado com código anterior”, informando valor e data aproximada; esse fluxo vai à análise e não altera automaticamente a elegibilidade atual.

### 6.6 Confirmação familiar

O responsável recebe alerta imediato e responde em até 48 horas:

- “Recebi o valor correto”;
- “Recebi outro valor”, informando apenas o valor efetivamente recebido;
- “Não identifiquei o recebimento”.

Somente a primeira opção conclui normalmente. Valor divergente e não localizado criam caso de acompanhamento e mantêm a família bloqueada. Ausência de resposta em 48 horas cria “Confirmação atrasada — requer acompanhamento”; nunca confirma nem reabre automaticamente.

Em atendimento assistido, entidade/admin registra canal (presencial ou telefone), resposta declarada, data/hora e observação curta opcional. O registro distingue quem declarou de quem digitou.

### 6.7 Ciclo diário

- ciclo começa às 08:00 em America/Sao_Paulo e termina às 08:00 seguinte;
- uma família tem no máximo uma doação principal confirmada por ciclo;
- se mais de um integrante da coorte já tiver enviado, todos os recebimentos são registrados e confirmados, mas os posteriores são marcados como simultâneos excepcionais e não criam novo ciclo, ranking, meta ou recibo;
- após a confirmação principal, a família volta a ser elegível no início do ciclo seguinte somente se todas as demais declarações da coorte estiverem resolvidas;
- declarações simultâneas são preservadas e tratadas individualmente, nunca ocultadas ou descartadas;
- pendência, divergência ou atraso impede reabertura automática;
- timestamps e restrições no banco garantem correção; o scheduler não é a fonte da verdade.

## 7. Estados

### 7.1 Versão da chave

`AWAITING_RESPONSIBLE_CONFIRMATION → PENDING_REVIEW → ACTIVE`

Saídas:

- PENDING_REVIEW → REJECTED;
- ACTIVE → SUSPENDED;
- ACTIVE/SUSPENDED → REVOKED;
- qualquer versão substituída → SUPERSEDED.

Apenas ACTIVE gera BR Code. Suspender impede novas revelações. Revogar/superseder encerra sessões abertas, mas não invalida cópias externas.

### 7.2 Intenção de Pix direto

`OPEN → DONOR_DECLARED → FAMILY_CONFIRMED`

Saídas alternativas:

- OPEN → CANCELED | EXPIRED;
- DONOR_DECLARED → CANCELED_BY_DONOR antes da resposta;
- DONOR_DECLARED → FOLLOW_UP_REQUIRED por valor divergente, não localizado, denúncia, revogação da chave ou timeout;
- FOLLOW_UP_REQUIRED → FAMILY_CONFIRMED | CANCELED | INCONCLUSIVE.

“FAMILY_CONFIRMED” significa somente “Recebimento confirmado pela família”.

### 7.3 Disponibilidade pública

| Condição interna | Estado público |
|---|---|
| elegível, chave ativa, sem bloqueio do ciclo | Disponível para doação |
| declaração aguardando resposta | Doação em andamento |
| recebimento confirmado no ciclo | Atendida neste ciclo |
| qualquer outro bloqueio ou falha | Doações indisponíveis no momento |

## 8. Concorrência e invariantes

1. A criação ou revelação da intenção não cria reserva exclusiva.
2. A primeira declaração cria, em transação serializável, o bloqueio único da família/ciclo e registra blockedAt.
3. Nessa mesma transação, a coorte é definida por intenções da família que possuíam revelação efetiva e grant válido em blockedAt; intenção apenas criada não entra.
4. Depois do bloqueio, nenhuma nova intenção ou revelação é permitida. Somente a coorte congelada pode declarar pelo caminho normal, respeitando o prazo individual de 24 horas.
5. A coorte permanece vinculada ao ciclo de blockedAt mesmo se uma declaração ocorrer depois das 08:00; ela nunca se torna candidata normal do ciclo seguinte.
6. Pix fora da coorte é declaração tardia excepcional e não altera automaticamente o ciclo atual.
7. Declaração, confirmação, cancelamento e resolução usam compare-and-set sobre o estado esperado.
8. Transição, auditoria e evento de outbox são gravados na mesma transação.
9. Idempotency-Key é obrigatório nas mutações críticas; mesma chave e mesmo corpo retornam o resultado anterior; corpo diferente retorna 409.
10. Relógio do servidor é autoritativo.
11. Troca de chave nunca redireciona uma intenção existente silenciosamente. Uma versão obsoleta leva a expiração ou acompanhamento conforme já tenha havido envio.
12. Restrição única no banco, não pre-check, garante responsável ativo, chave ativa e bloqueio de ciclo.

## 9. Modelo de dados proposto

Nomes são indicativos; a implementação pode ajustá-los sem alterar invariantes.

### 9.1 User

Adicionar:

- emailVerifiedAt;
- relações para desafios, vínculos e ações Pix.

Não marcar contas existentes como verificadas automaticamente. Acesso Pix exige verificação antes do primeiro uso.

### 9.2 SecurityChallenge

- id, userId, purpose, codeHash, expiresAt, consumedAt, attempts, createdAt;
- código de uso único, validade 10 minutos;
- novo código invalida os anteriores do mesmo propósito;
- limites por usuário/IP/purpose;
- propósitos separados de recuperação de senha.

### 9.3 FamilyResponsibleAssignment

- id, familyId, userId, assignedByUserId, startsAt, endsAt, endReason;
- índices únicos parciais para familyId ativo e userId ativo;
- FKs RESTRICT;
- troca encerra vínculo, suspende chave e sessões e exige nova revisão.

Family.beneficiaryUserId permanece temporariamente legado/read-only e não é autoridade do novo fluxo.

### 9.4 FamilyPixKeyVersion

- id, familyId, responsibleAssignmentId;
- encryptedEnvelope (schemaVersion, KID, nonce, ciphertext, tag);
- fingerprintHmac e fingerprintKeyVersion;
- maskedValue;
- status e submissionSource;
- responsibleConfirmedAt;
- submittedByUserId, reviewedByUserId, secondApprovedByUserId;
- reviewedAt, reviewReasonCode, expectedHolderNameEncrypted;
- supersededById, createdAt, updatedAt.

Restrições:

- uma ACTIVE por família;
- uma PENDING/ACTIVE por fingerprint em famílias distintas sem análise;
- AAD inclui propósito, recordId, familyId, assignmentId e versão;
- HMAC usa segredo distinto da criptografia;
- rotação de HMAC faz dual-read/dual-write até validar unicidade.

### 9.5 DirectPixIntent

- id, donorId, familyId, responsibleAssignmentId, pixKeyVersionId;
- amountCents, txid único, status;
- cycleStartAt, cycleEndAt;
- createdAt, firstDisclosedAt, lastDisclosureExpiresAt, declarationDeadlineAt;
- cycleId e cohortCapturedAt opcionais, preenchidos quando a primeira declaração congelar a coorte;
- declaredAt, confirmationDeadlineAt, confirmedAt, canceledAt, expiredAt;
- brCodePayloadHash, nunca payload;
- donorAlias imutável.

Checks:

- amountCents entre 500 e 100000;
- txid opaco, alfanumérico e compatível com BR Code;
- deadline de declaração no máximo 24 horas;
- coerência entre estado e timestamps.

### 9.6 PixDisclosureGrant

- id, intentId, actorUserId, purpose, tokenHash único;
- expiresAt ≤ createdAt + 15 minutos;
- revokedAt, lastAccessedAt, accessCount;
- válido somente com Bearer JWT atual, mesmo ator/recurso/finalidade e chave ainda ativa.

### 9.7 DirectPixDeclaration

- intentId único, declaredByUserId, declaredAt pelo servidor;
- claimedPaidAt opcional e limitado a faixa plausível;
- canceledAt, cancelReasonCode;
- nenhum comprovante ou URL de recibo.

### 9.8 DirectPixReceiptConfirmation

- intentId único, responsibleAssignmentId;
- outcome: RECEIVED_EXACT, RECEIVED_DIFFERENT, NOT_LOCATED;
- receivedAmountCents somente quando diferente;
- declaredByResponsibleUserId;
- recordedByOperatorUserId opcional, assistedChannel opcional;
- respondedAt e reasonCode;
- imutável; correções geram evento/resolução, não edição destrutiva.

### 9.9 FamilySupportCycle

- id, familyId, cycleStartAt, cycleEndAt, status;
- blockedAt, completedAt, releasedAt;
- primaryIntentId opcional;
- unique(familyId, cycleStartAt).

É criado na primeira declaração, não na criação/revelação do QR. A mesma transação fixa blockedAt, seleciona a coorte por revelação efetiva com grant válido e associa essas intenções ao ciclo. O ciclo só é liberado quando não restar declaração pendente e uma transição autorizada determinar que não houve recebimento. Uma confirmação é marcada como principal; confirmações adicionais da mesma coorte são simultâneas excepcionais.

### 9.10 DirectPixFollowUpCase

- id, intentId, reason, status, openedAt, dueAt;
- assignedToUserId, resolution, resolvedByUserId, resolvedAt;
- reasonCode e nota interna curta sem dados bancários;
- no máximo um caso aberto por intenção.

Motivos: titular divergente, valor divergente, não localizado, timeout, código antigo, chave/responsável revogado, denúncia ou outro.

### 9.11 IdempotencyRecord

- actorUserId, operation, idempotencyKey, requestHash;
- resourceType/resourceId, status, expiresAt;
- unique(actorUserId, operation, idempotencyKey);
- nunca persiste resposta de revelação, EVP ou BR Code.

### 9.12 FeatureFlag

- key, enabled, config, updatedByUserId, updatedAt;
- flags mínimas: onboarding, creation, disclosure, jobs, legacy-write e kill switch;
- habilitação por entidade/família para piloto;
- falha de leitura desabilita criação/revelação.

### 9.13 OutboxEvent e JobRun

Outbox contém apenas IDs opacos, tipo de evento, disponibilidade, tentativas e dedupe key. JobRun registra job, scheduledFor, lease, tentativa, resultado, duração e código de erro. Nunca transportam EVP, QR, nome civil ou observação livre.

### 9.14 AuditLog

Ampliar ou criar auditoria append-only com:

- ator e papel no instante;
- autoridade/escopo de entidade;
- ação, agregado e versão;
- estado anterior/novo sem segredo;
- motivo estruturado;
- correlação e idempotência;
- canal Web/app/job/assistido;
- timestamp do servidor e resultado;
- declarante real quando operador registra atendimento;
- IP truncado/protegido somente após aprovação jurídica.

Índices por ator/data, ação/data, agregado e data. Correções são novos eventos. Operadores comuns não editam auditoria.

## 10. Matriz de permissões

| Operação | Doador | Responsável | Entidade vinculada | Admin/revisor | Job |
|---|---:|---:|---:|---:|---:|
| Criar intenção | Própria | Não | Não | Não | Não |
| Revelar QR | Própria intenção | Própria chave após step-up | Só sessão assistida justificada | Break-glass | Renderizador restrito |
| Declarar/cancelar envio | Própria intenção | Não | Não | Não pode fabricar | Expirar somente |
| Submeter EVP | Não | Própria família | Assistido | Não substitui normalmente | Não |
| Confirmar submissão assistida | Não | Obrigatório | Não | Não | Não |
| Revisar/ativar EVP | Não | Não | Se não submeteu e no escopo | Sim | Não |
| Trocar/revogar EVP | Não | Própria, com step-up | Solicita/assiste | Suspensão emergencial | Reconcilia somente |
| Confirmar recebimento | Não | Própria família | Registra resposta obtida | Resolve caso, não impersona | Lembra/escala |
| Ver histórico | Próprio | Própria família | Famílias próprias, minimizado | Conforme permissão | Processamento restrito |
| Alterar flags | Não | Não | Não | Admin autorizado | Não |
| Ler auditoria | Não | Próprios eventos mínimos | Escopo próprio mínimo | Auditor autorizado | Exporta/monitora |

Autorização por objeto é aplicada no serviço; roleGuard sozinho nunca basta. Recursos sem relação devem responder 404 quando isso reduzir enumeração.

## 11. Contratos REST

Todos os valores monetários são inteiros em centavos; datas ISO-8601; erros seguem {message, code}. Validação retorna 422. Mutações críticas exigem Idempotency-Key e X-Correlation-Id opcional/gerado.

### 11.1 Conta e segurança

- POST /auth/email-verification/request
- POST /auth/email-verification/confirm {token}
- POST /auth/challenges/request {purpose}
- POST /auth/challenges/confirm {purpose, code}

Respostas de solicitação são neutras e não revelam existência de conta.

### 11.2 Perfil do responsável

- GET /beneficiary/direct-pix-profile
  - retorna família, vínculo, chave mascarada/status e canReceiveDirectPix.
- POST /beneficiary/direct-pix-keys
  - body {keyType:"EVP", value:"uuid"}; retorna versão mascarada.
- POST /beneficiary/direct-pix-keys/:id/confirm
  - confirma submissão assistida após step-up.
- POST /beneficiary/direct-pix-keys/:id/revoke
  - body {reasonCode}; exige step-up.
- GET /beneficiary/direct-pix-intents
- POST /beneficiary/direct-pix-intents/:id/confirmation
  - body {outcome, receivedAmountCents?, reasonCode?}.

### 11.3 Vínculo e revisão

- POST /families/:id/responsible-invitations
- POST /families/:id/responsible-assignments
- POST /families/:id/responsible-assignments/:id/end
- POST /entities/families/:id/direct-pix-keys (cadastro assistido)
- GET /admin/direct-pix-keys?status=&cursor=
- POST /admin/direct-pix-keys/:id/review
  - body {decision:"APPROVE"|"REJECT", reasonCode, note?}.
- POST /admin/direct-pix-keys/:id/second-approval
- POST /admin/direct-pix-keys/:id/suspend

Listas nunca devolvem EVP integral.

### 11.4 Doador

- POST /direct-pix-intents
  - body {familyId, amountCents}; retorna intenção, família pública, prazo e ações.
- GET /direct-pix-intents/:id
  - DTO por papel, sem EVP/QR.
- GET /me/direct-pix-intents?cursor=
- POST /direct-pix-intents/:id/disclosure-grants
  - retorna token uma vez e expiresAt; no-store.
- GET /direct-pix-intents/:id/disclosure
  - headers Authorization + X-Disclosure-Token;
  - retorna pix {keyType, key, recipientName}, brCode {format, payload, txid, amountCents}, expiresAt;
  - Cache-Control: no-store, Pragma: no-cache.
- POST /direct-pix-intents/:id/declaration
  - body {claimedPaidAt?}; idempotente.
- POST /direct-pix-intents/:id/cancel-declaration
  - body {reasonCode}.
- POST /me/direct-pix-late-declarations
  - body {intentId?, amountCents, approximatePaidAt, reasonCode}; sempre abre acompanhamento.
- POST /direct-pix-intents/:id/report-recipient-mismatch
  - body {reasonCode}; não aceita captura.

### 11.5 Acompanhamento e operação

- GET /entities/direct-pix-follow-ups?status=&cursor=
- GET /admin/direct-pix-follow-ups?status=&cursor=
- POST /admin/direct-pix-follow-ups/:id/assign
- POST /admin/direct-pix-follow-ups/:id/resolve
  - resolution: CONFIRMED_BY_FAMILY, DIFFERENT_AMOUNT, NOT_RECEIVED, CANCELED_MISTAKE, KEEP_OPEN, SUSPEND_KEY, INCONCLUSIVE;
  - reasonCode obrigatório.
- GET /admin/feature-flags
- PATCH /admin/feature-flags/:key
- GET /admin/jobs/runs

Workers usam identidade de serviço; não existem endpoints públicos que finjam executar jobs.

### 11.6 Erros de domínio

- 409: active_responsible_exists, family_cycle_blocked, invalid_state, idempotency_conflict, stale_key_version, duplicate_evp_review_required;
- 403/404: forbidden, not_family_responsible, resource_not_found;
- 410: disclosure_expired, intent_expired, legacy_flow_read_only;
- 422: invalid_evp, amount_out_of_range, invalid_confirmation;
- 423: direct_pix_disabled, family_temporarily_unavailable, key_suspended.

## 12. BR Code

O módulo de geração deve:

- seguir o Manual de Padrões para Iniciação do Pix/BR Code vigente;
- usar EVP canônica ativa e fixada à intenção;
- incluir valor exato;
- gerar txid opaco, sem CPF, nome, familyId público ou sequência previsível;
- usar nome técnico e cidade normalizados; cidade vem do cadastro da família, sem bairro/endereço;
- usar “Doação Mealfy” quando suportado;
- calcular e validar CRC16;
- tratar MerchantName apenas como campo técnico, não como identidade verificada;
- testar contra vetores dourados e decodificação independente.

A tela deve informar que o banco exibirá o titular oficial. Se divergir do nome esperado, o usuário não deve pagar e deve reportar.

## 13. Criptografia e segredos

- AEAD AES-256-GCM ou envelope KMS;
- envelope autoidentificado com schemaVersion e KID;
- nonce aleatório único e tag de autenticação;
- AAD vinculando finalidade, registro, família, responsável e versão;
- keyring lê versões anteriores, mas só KID atual grava;
- recriptografia em lotes resumíveis e idempotentes;
- chaves de criptografia e HMAC rotacionadas independentemente;
- segredo em secret manager, separado por ambiente;
- backups cifrados e restore testado;
- nenhuma EVP real em dev, CI, homologação, fixtures, screenshots ou documentação.

O crypto.service atual de gift cards não deve ser reutilizado sem envelope, AAD, versionamento e rotação.

## 14. Notificações e jobs

### 14.1 Cadência

- imediato: alerta ao responsável;
- 24 horas: primeiro lembrete;
- 44 horas: lembrete final;
- 48 horas: acompanhamento atrasado e alerta à entidade/admin;
- divergência: atendimento iniciado em até 1 dia útil, escalado em 2 dias úteis.

### 14.2 Jobs duráveis

- expirar grants de 15 minutos;
- expirar intenções não declaradas após 24 horas;
- enviar lembretes 24/44h;
- escalar confirmações em 48h;
- reconciliar ciclo às 08:00;
- retry/deduplicação de outbox;
- detectar estados presos;
- recriptografar/rotacionar índices;
- aplicar retenção.

Usar leases/advisory lock ou SKIP LOCKED, retry exponencial com jitter, dead letter, métricas e alertas. Jobs são idempotentes e retomam atrasos após indisponibilidade.

### 14.3 Conteúdo

Notificações contêm texto genérico e deep link autenticado. Nunca incluem EVP, QR, nome civil, dados de crianças, observação livre ou dados bancários. E-mail é alerta; o app é a fonte de verdade.

## 15. Auditoria e observabilidade

Auditar submissão, confirmação, revisão, segunda aprovação, revelação permitida/negada, troca, suspensão, revogação, criação de intenção, declaração, confirmação familiar, resolução, break-glass, flag, job e incidente.

Métricas permitidas, com IDs opacos:

- intenção criada/expirada;
- QR exibido e código copiado;
- envio declarado/cancelado;
- confirmação/divergência;
- tempo de resposta;
- chave submetida/aprovada/rejeitada;
- negações de autorização e falhas de worker.

Não enviar nomes, EVP, QR, família, e-mail, observações ou motivos livres. Logs estruturados usam correlação e códigos, não corpos de requests/responses.

## 16. LGPD, retenção e direitos

Antes de dados reais:

- identificar controladora, CNPJ, operadores e contato correto;
- definir base legal com assessoria; não presumir consentimento;
- revisar termos e política;
- realizar RIPD/DPIA considerando famílias vulneráveis e crianças;
- definir retenção por classe, legal holds e resposta a incidente;
- firmar obrigações com fornecedores.

Política mínima:

- chave ativa: enquanto necessária e família habilitada;
- chave revogada/substituída: apagar valor utilizável e manter apenas fingerprint/metadados/auditoria pelo prazo aprovado;
- sessão abandonada/dados efêmeros: até 24 horas;
- logs de acesso: sugestão inicial de 90 dias, sujeita à revisão jurídica;
- declarações/confirmações: prazo jurídico e operacional documentado;
- exclusão: desativação imediata, suspensão da chave, anonimização/eliminação do desnecessário e retenção mínima justificada;
- exportação autenticada: cadastro, vínculos, aceites, versões sem segredo revogado, declarações e confirmações, sem dados de terceiros ou sinais antifraude sensíveis.

Ambientes não produtivos usam dados sintéticos e captura/allowlist de e-mail.

## 17. Feature flags, suspensão e incidente

Níveis de suspensão:

- chave;
- família;
- entidade;
- conta doadora;
- conta responsável;
- sistema inteiro.

Toda suspensão tem motivo, autoria, duração opcional e auditoria. Kill switch impede novas intenções/revelações, oculta sessões abertas e preserva leitura, declaração já realizada, confirmação e resolução segura.

Runbook de comprometimento:

1. suspender escopo afetado;
2. encerrar grants e revogar tokens quando necessário;
3. preservar auditoria;
4. impedir novas revelações;
5. notificar responsável/entidade sem repetir EVP;
6. orientar remoção da chave no banco quando aplicável;
7. investigar acessos e declarações;
8. rotacionar segredos;
9. avaliar comunicação ANPD/titulares;
10. recuperar, validar e realizar postmortem.

Rollback não recolhe QRs copiados.

## 18. Migração e corte

### Fase 0 — pré-condições

- documentação aprovada;
- controladora/base legal/RIPD/termos definidos antes de dados reais;
- keyring, HMAC, backup/restore e BR Code testados;
- flags e kill switch desligados por padrão;
- remover qualquer fallback financeiro local/mock em produção.

### Fase 1 — expandir

Adicionar tabelas, enums, FKs, checks e índices sem alterar registros legados. Adicionar e-mail verificado, desafios, outbox, jobs e auditoria aprimorada.

### Fase 2 — vínculos

Gerar relatório de Family.beneficiaryUserId. Criar assignment somente para correspondências unívocas e validadas. Colisões ficam em quarentena para saneamento humano. Não escolher findFirst nem apagar histórico.

### Fase 3 — dark launch

Deploy de leitura e módulos com flags off. Testar autorização, idempotência, concorrência, tempos, segredo e observabilidade. Cadastrar EVP somente em ambiente sintético até aprovação jurídica; depois, coorte explícita.

### Fase 4 — operação

Ativar workers/outbox em shadow mode. Preparar convites, revisão presencial, treinamento, SLA e runbooks. Representar atividade legada do ciclo para impedir criação simultânea pelo outro fluxo.

### Fase 5 — drenar legado

Concluir pagamentos já confirmados e vales devidos. Cancelar cobranças pendentes não pagas conforme política. Nenhuma cobrança antiga é convertida automaticamente. Rotular histórico como “Vale-presente — modelo anterior”.

### Fase 6 — piloto

Web/PWA, uma entidade, até dez famílias, 30 dias. Habilitar progressivamente onboarding → criação → revelação. Apps móveis incompatíveis recebem atualização obrigatória. Backend recusa escrita legada com 410 legacy_flow_read_only.

### Fase 7 — expansão e remoção

Após gates do piloto, liberar apps e outras entidades. O alvo para encerrar rollback é 30 dias, condicionado a zero obrigação antiga pendente e nenhum bloqueador crítico. Remover rotas/telas/credenciais de criação/fulfillment legado, mantendo adaptador de leitura histórica pelo prazo de retenção.

## 19. Estratégia de testes

### 19.1 Unidade/propriedade

- UUID canônico; rejeição de CPF, telefone, e-mail e malformado;
- R$5/R$1000 inclusivos e limites externos;
- ciclo em 07:59:59/08:00:00 America/Sao_Paulo e transições de horário legal/tzdata;
- BR Code, CRC e vetores oficiais;
- nenhuma copy/state usa “pago/verificado” indevidamente;
- declaração não altera ranking, recibo, meta ou total confirmado.

### 19.2 Criptografia

- round-trip AEAD;
- KID/AAD/tag errados e ciphertext trocado falham fechado;
- fingerprint canônico e concorrência de duplicidade;
- rotação/resume/rollback e dual-HMAC;
- nenhuma chave em DB claro, DTO, log, audit, cache ou notificação;
- restore cifrado exercitado.

### 19.3 Integração PostgreSQL

- dois responsáveis concorrentes;
- duas ativações de EVP;
- várias intenções antes da primeira declaração;
- primeira declaração bloqueia novas intenções;
- intenção anterior ainda declara;
- replay idempotente e conflito de corpo;
- races expirar×declarar, confirmar×escalar, trocar chave×revelar;
- auditoria e outbox atômicos;
- retry/dead letter sem notificação duplicada.

Os E2E deste projeto devem subir primeiro o Docker Compose da raiz e obter dele a URL PostgreSQL E2E.

### 19.4 Autorização e privacidade

Matriz completa por papel, família, entidade e recurso, incluindo IDOR/BOLA, enumeração, contas suspensas, token/grant vencido, break-glass e atendimento assistido. Snapshot de todos os DTOs, logs e e-mails para ausência de segredo.

### 19.5 E2E/UI e acessibilidade

- teclado, leitor de tela, zoom e contraste;
- valor/nome disponíveis em texto;
- payload não anunciado integralmente;
- confirmação de cópia;
- rede perdida não simula sucesso;
- cache/service worker não conserva resposta;
- aviso de titular divergente e limitação do QR estático;
- mobile antigo recebe atualização obrigatória.

### 19.6 Operação

Game day de kill switch, suspensão, revogação, rotação, falha de worker, reconstrução de auditoria, restore e rollback. Teste de exportação, anonimização e retenção.

## 20. Gates de lançamento

Nenhum Pix real antes de todos os itens P0:

- [ ] controladora/CNPJ/contato definidos;
- [ ] base legal, RIPD, termos, privacidade e retenção aprovados juridicamente;
- [ ] responsável técnico, operação, segurança/privacidade e produto aprovam;
- [ ] e-mail verificado, OTP e recuperação sem bypass;
- [ ] vínculo 1:1 saneado;
- [ ] criptografia/HMAC/rotação/backup/restore testados;
- [ ] BR Code e CRC testados;
- [ ] RBAC, BOLA, concorrência, idempotência e não exposição aprovados;
- [ ] audit/outbox/workers/alertas/runbooks exercitados;
- [ ] flags e kill switch testados;
- [ ] nenhum mock/local fallback financeiro em produção;
- [ ] jobs 24/44/48h e ciclo 08:00 monitorados;
- [ ] UI contém avisos e linguagem declaratória;
- [ ] equipes e entidade piloto treinadas;
- [ ] observabilidade sem PII.

## 21. Critérios de sucesso do piloto

Após 30 dias:

- nenhuma EVP/nome civil em logs ou analytics;
- nenhum acesso entre famílias/papéis;
- nenhuma duplicação por idempotência;
- jobs e ciclo executados corretamente;
- divergências rastreáveis e atendimento iniciado no SLA;
- responsáveis entendem a confirmação;
- doadores entendem a conferência no banco;
- nenhum bloqueador crítico de segurança/privacidade;
- aprovação formal de produto, técnica, operação, segurança/privacidade e jurídica.

Conversão não compensa falha de segurança.

## 22. Aprovações requeridas

Antes da implementação com dados sintéticos: produto e responsável técnico aprovam arquitetura e escopo.

Antes de coletar dados reais: produto, técnica, operação, segurança/privacidade e assessoria jurídica aprovam identidade do controlador, base legal, RIPD, termos, retenção, incidentes e operação.

## 23. Referências oficiais

- [Manual de Padrões para Iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf)
- [Manual Operacional do DICT](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/X_ManualOperacionaldoDICT.pdf)
- [Esquema oficial da API DICT](https://github.com/bacen/pix-dict-api/blob/master/openapi/schemas.yaml)
- [LGPD — Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Guia da ANPD sobre legítimo interesse](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_hipoteses_legais_tratamento_de_dados_pessoais_legitimo_interesse)
