# Direct Pix — gate operacional do piloto (ticket 32)

**Estado padrão:** bloqueado. Este documento autoriza somente um piloto operacional com **1 entidade, até 10 famílias e 30 dias**. Ele não autoriza Pix estático Owl4tech, aplicativo nativo, funcionamento offline, download/compartilhamento do QR, nem o uso dos agregados legados de doação/pagamento/vale.

## Limites e princípios

- Canal: **Web/PWA autenticada**. O cliente não pode guardar QR, BR Code, EVP, nome civil ou resposta de revelação em cache, service worker, storage ou analytics.
- O Pix é enviado diretamente ao responsável. A Mealfy não recebe, custodia, liquida nem verifica o dinheiro.
- Nenhum painel, alerta ou comunicação pode dizer “pagamento verificado”. Use “declaração do doador” e “recebimento confirmado pela família”.
- Operação só com EVP aleatória ativa/revisada; sem CPF, telefone, e-mail, QR/static Pix de Owl4tech, comprovante, screenshot, extrato ou dados bancários.
- Métricas, logs, auditoria e alertas usam somente IDs opacos, contagens, estados, códigos estáveis e durações. Não incluir nome, e-mail, telefone, EVP, BR Code, QR, valor individual, observação livre ou IP.

## Configuração persistida (fail closed)

Os controles estão em `direct_pix_feature_flags` e são alterados somente por administrador autenticado via `PATCH /admin/direct-pix/feature-flags/:key`. Toda alteração exige `expectedVersion`, `X-Correlation-Id` e `reason` estruturado; é auditada sem segredo. Ausência/falha de leitura = desabilitado.

1. Mantenha `KILL_SWITCH` global desabilitado (se habilitado, criação/revelação é bloqueada).
2. Mantenha os controles globais `ONBOARDING`, `CREATION`, `DISCLOSURE` e `JOBS` desabilitados, salvo aprovação explícita e janela ativa.
3. Para a entidade piloto, crie flags de família para as famílias aprovadas, com `config: {"pilot": true}`. O backend recusa a 11ª família piloto por entidade/flag.
4. Não crie config de piloto em escopo global ou de entidade. Confirme a associação família→entidade antes de cada alteração.
5. `LEGACY_WRITE` permanece desabilitada. Não há dual-write com Donation, Payment, GiftCard ou seus agregados.
6. Inicie com uma família; amplie gradualmente até o máximo de 10 somente após a revisão diária sem incidente.

Exemplo de alteração (substitua somente IDs opacos e nunca registre a resposta contendo PII):

```http
PATCH /admin/direct-pix/feature-flags/CREATION
Authorization: Bearer <admin-token>
X-Correlation-Id: <uuid>
Content-Type: application/json

{
  "scope": "FAMILY",
  "entityId": "<entity-uuid>",
  "familyId": "<family-uuid>",
  "enabled": true,
  "config": { "pilot": true },
  "expectedVersion": 0,
  "reason": { "code": "PILOT_APPROVED" }
}
```

## Pré-gate de entrada

Todos precisam estar marcados antes da primeira ativação:

- [ ] Aprovações de controlador, base legal, termos, retenção e operações registradas nas variáveis/referências de produção exigidas no boot.
- [ ] `APP_ENV=production`, `DIRECT_PIX_MODE=live`, SMTP de produção e material EVP versionado/segregado validados; ambiente não inicia se faltar gate obrigatório.
- [ ] Uma entidade aprovada, operador(es) e canal de escalonamento identificados; no máximo 10 famílias explicitamente aprovadas.
- [ ] Responsável adulto, vínculo único, e-mail verificado, step-up e EVP revisada presencialmente em cada família liberada.
- [ ] Revisar Web/PWA: resposta de revelação com `Cache-Control: no-store`; nenhum armazenamento offline/analytics dos dados de revelação; sem build nativo no piloto.
- [ ] Dashboard e alertas abaixo testados com dados sintéticos; log/alerta revisado para ausência de PII.
- [ ] Gameday de kill switch e rollback concluído e registrado por referência de auditoria.

## Dashboard operacional PII-free

O dashboard é uma consulta agregada de 30 dias, filtrada por entidade piloto e família apenas por IDs opacos. Não expor listas de famílias/doadores nem drill-down de valores.

| Sinal | Fonte/definição | Alerta |
|---|---|---|
| Estado do gate | resolução de `KILL_SWITCH`, `CREATION`, `DISCLOSURE`, `JOBS`; versão/idade da flag | qualquer flag inesperada ou leitura indisponível |
| Tamanho da coorte | contagem de flags de família habilitadas com `config.pilot=true` | `>10` (bloqueador) |
| Janela do piloto | início/fim aprovados; dias restantes | fim de 30 dias ou extensão não aprovada |
| Disponibilidade API | `GET /health`: status e banco, sem PII | não-200, banco desconectado ou p95 degradado |
| Fluxo seguro | contagens por estado de intent/ciclo e transições por código | aumento anormal de `FOLLOW_UP_REQUIRED`, timeout ou indisponibilidade |
| Chaves | somente contagem por status (ativa, pendente, suspensa/revogada) | chave ativa inesperadamente suspensa/revogada |
| Jobs/outbox | contagens de `PENDING`, lease vencido, `DEAD_LETTER`, JobRun por status/duração | dead letter >0; lease vencido; job parado |
| Segurança/auditoria | contagem de alterações de flags por código/result; falha de autorização/423 | alteração fora da janela, kill switch acionado, falhas repetidas |

Retenção do dashboard: snapshots agregados e sem PII conforme política aprovada. Auditoria detalhada é break-glass, por pessoal autorizado, e não é exportada para o dashboard.

## Operação diária e validação pós-deploy

1. Confirmar `/health` = `status: ok` e banco conectado.
2. Conferir flags, versões e tamanho da coorte no painel admin; validar que `KILL_SWITCH` está desabilitado.
3. Conferir jobs/outbox; não liberar expansão com dead letter, falha de job ou alerta sem proprietário.
4. Executar um smoke test Web/PWA com conta e EVP sintéticas em ambiente homologado: criação, grant/revelação, declaração e confirmação familiar; verificar linguagem não-financeira e cabeçalho `no-store`.
5. Durante o piloto, revisar dashboard pelo menos no início e fim de cada janela operacional e após toda alteração de flag. Registrar somente correlação, ação, resultado e código estruturado.
6. Ao final de 30 dias, desabilitar `CREATION`, `DISCLOSURE`, `ONBOARDING` e `JOBS`, preservar resolução/auditoria e fazer revisão formal antes de qualquer extensão.

## Kill switch, rollback e gameday

### Acionamento imediato

Acione `KILL_SWITCH` global com `enabled: true`, motivo `INCIDENT_CONTAINMENT` e correlação nova ao detectar exposição potencial de EVP/QR/nome, autorização incorreta, lógica de QR estático Owl4tech, dashboard com PII, falha sistêmica, ou desvio de escopo.

Efeito esperado: nova criação e revelação respondem indisponíveis (423); resolução segura, auditoria e tratamento de casos continuam. O switch **não revoga QR copiado nem uma EVP no DICT**; suspenda/revogue a chave pelo fluxo autorizado quando aplicável.

### Rollback

1. Habilitar kill switch global; capturar ID de correlação e confirmar bloqueio com teste não sensível.
2. Desabilitar `CREATION`, `DISCLOSURE`, `ONBOARDING` e `JOBS` nos escopos afetados, usando controle otimista de versão.
3. Não apagar intenções, declarações, confirmações, audit logs ou flags; não modificar agregados legados.
4. Avaliar chaves afetadas e suspender/revogar por fluxo autorizado; abrir acompanhamento quando necessário.
5. Corrigir causa, executar validação sintética e revisão de privacidade, então somente reativar com nova aprovação registrada.

### Gameday obrigatório antes da ativação e mensalmente

- [ ] Simular leitura de flag indisponível: criação/revelação falham fechadas.
- [ ] Simular kill switch: novas criações/revelações recebem 423; resolução permanece disponível.
- [ ] Simular outbox dead letter e confirmar alerta sem payload sensível.
- [ ] Simular chave suspensa/revogada e confirmar que não há nova revelação.
- [ ] Inspecionar logs, auditoria e dashboard para provar ausência de PII/EVP/QR/BR Code.
- [ ] Executar rollback completo e confirmar que não foi escrito nenhum agregado legado.

## Critérios de saída/pausa

Pause imediatamente por qualquer alerta crítico, dead letter não tratado, falha de autorização, suspeita de PII, chave comprometida, ou desvio de canal/escopo. Encerrar ao completar 30 dias. A expansão exige revisão jurídica, operacional, segurança, métricas agregadas e novo gate; esta configuração não habilita mais entidades, mais de 10 famílias, aplicativo nativo nem Pix estático Owl4tech.
