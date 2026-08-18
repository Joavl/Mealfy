# Revisão para produção — modularidade do fornecimento e entrega digital

> Foco desta revisão: **trocar o fornecimento de gift card sem reescrever o núcleo**
> (hoje compra/venda na mão, amanhã API do iFood) e tratar a entrega como
> **fulfillment digital**. Complementa [`PRODUCAO-READINESS.md`](./PRODUCAO-READINESS.md),
> que cobre deploy/segurança/LGPD.

---

## 0. Antes de tudo: "produto digital" é uma decisão com consequência dupla ⚠️

Vale separar **arquitetura** de **enquadramento comercial** — são coisas diferentes e
misturá-las custa dinheiro:

| | Arquitetura (técnico) | Enquadramento (loja + fiscal) |
|---|---|---|
| O que é | Pipeline de fulfillment digital: pagou → emite → entrega código | Como você **declara** a transação |
| Recomendação | ✅ Sim, trate como produto digital. É o desenho certo e já é o que o código faz | ⚠️ **Cuidado** com "venda de produto digital" |

**Por quê o cuidado:** doações beneficentes são **isentas** da obrigação de usar o
Google Play Billing. Gift card consumido no mundo real (comida) normalmente também.
Mas se a ficha da loja descrever "venda de produto digital", você convida o revisor a
aplicar as regras de bens digitais — e aí o Play Billing passa a ser exigido, com
**15–30% de comissão sobre cada doação**. No fiscal brasileiro a diferença é igualmente
grande (venda de produto vs. recebimento de doação têm tributação distinta — já está
como pendência de contador no roadmap).

**Sugestão:** manter o enquadramento de **doação/apoio** na loja e no fiscal, e usar o
modelo de produto digital apenas como **arquitetura interna de entrega**. Confirmar com
contador/advogado antes de publicar.

---

## 1. Modularidade do fornecimento — o que já está pronto ✅

A abstração que você quer **já existe e está bem feita**. Não precisa construir, precisa
endurecer:

- `GiftCardProvider` (`giftCards/providers/gift-card-provider.ts`): `getCatalog`,
  `checkAvailability`, `purchaseGiftCard`, `getOrderStatus`, `cancelOrder?`
- `ManualInventoryGiftCardProvider` implementado (estoque importado à mão)
- Fábrica por env (`GIFT_CARD_PROVIDER`); `ifood_card`, `todo_incomm`, etc. são
  placeholders declarados
- Orquestrador (`donationFulfillment.service.ts`) com desenho de **2 fases**: marca
  em andamento → chama o provider **fora** da transação → claim atômico
- `manual_review` **preserva o código já comprado** (cifrado) em vez de perder dinheiro
- Códigos nunca em texto puro: `codeEncrypted` + `codeMasked` + `codeHash`
- `idempotencyKey` por doação na compra

Isso significa que a troca de fornecedor **não deveria** exigir mexer no núcleo. Os 4
pontos abaixo são onde essa promessa ainda não se sustenta.

---

## 2. Os 4 gaps reais para plugar o iFood amanhã

> **Status:** 2.1, 2.2 e 2.3 **resolvidos** (ver seções 2.5 e 2.6). Só 2.4 segue aberto.

### 2.1 ✅ ~~Provider é global, mas a marca é por doação~~ — RESOLVIDO
`GIFT_CARD_PROVIDER` é **uma** variável e `giftCardProvider` é um singleton de módulo.
Só que a marca do cartão (`ifood` / `ninetynine` / `carrefour`) é escolhida **por doação**.

**Consequência:** você não consegue ter *"iFood via API + Carrefour via estoque manual"*
ao mesmo tempo — que é exatamente o estado de transição que você vai viver.

**Revisar:** trocar o singleton por um **registry por marca** com fallback:
```
resolveProvider(brand) → provider   // ifood → IfoodApiProvider
                                    // carrefour → ManualInventory (fallback)
```

### 2.2 ✅ ~~A compra é assumida como síncrona~~ — RESOLVIDO
`PurchaseGiftCardOutput.code` é **obrigatório** (`code: string`) — o contrato só admite
"comprei e já tenho o código". Uma API de fornecedor real costuma ser **assíncrona**:
aceita o pedido e entrega o código depois (webhook ou polling).

Os estados já existem (`gift_card_purchase_pending`, tabela `GiftCardOrder`), mas o
contrato não expressa "aceito, código vem depois".

**Revisar:** tornar o retorno uma união discriminada:
```ts
| { status: 'issued';  code: string; ... }
| { status: 'pending'; externalOrderId: string }   // código chega depois
```

### 2.3 ✅ ~~Não existe reconciliação — risco de pedido órfão~~ — RESOLVIDO
`getOrderStatus` está no contrato mas **nunca é chamado**. Não há job que verifique
orders presas em `processing`.

**Consequência:** com fornecedor assíncrono (ou queda de rede no meio da compra), o
pedido fica órfão — **doador pagou, família não recebeu, e ninguém é avisado**. Hoje
está mascarado porque o `manual_inventory` é local e síncrono.

**Revisar:** cron de reconciliação que varre `processing` antigas, consulta
`getOrderStatus` e conclui ou escala para `manual_review` + **alerta**.

### 2.4 🟡 `existingGiftCardId` vaza o modelo manual no contrato genérico
O campo existe em `PurchaseGiftCardOutput` só para o `manual_inventory` (reclamar um
`GiftCard` já em estoque). Funciona — providers de API deixam `undefined` e o
orquestrador cria a linha nova — mas é o único ponto onde a abstração se curva para uma
implementação específica.

**Revisar:** não é bug; decidir se vale isolar (ex.: o provider devolver sempre um
código e o "reclamar do estoque" ficar interno ao manual provider).

### 2.5 ✅ O que foi implementado (2.1 + 2.2)

**Registry por marca** (`giftCards/providers/index.ts`)
- `resolveGiftCardProvider(brand)` — precedência: override por marca > padrão
- Nova env `GIFT_CARD_PROVIDER_BY_BRAND` (`ifood:ifood_card,carrefour:manual_inventory`),
  **validada no boot** (marca/fornecedor inexistente é rejeitado)
- Instanciação **preguiçosa** com cache: um fornecedor não implementado configurado
  para uma marca que ninguém usa **não derruba mais o boot** (antes o singleton
  eager lançava durante o import)
- `switch` exaustivo: fornecedor novo no enum do Prisma quebra a compilação

**Contrato assíncrono** (`gift-card-provider.ts`)
- `PurchaseGiftCardOutput` virou união discriminada: `{status:'issued'} & IssuedGiftCard`
  ou `{status:'pending'} & PendingGiftCardOrder` — o compilador **força** tratar os dois
- Novo `fetchIssuedOrder?(externalOrderId)` para buscar o código depois
- Orquestrador: no caso `pending`, a doação **fica** em `gift_card_purchase_pending`,
  a família **não** é marcada alimentada e **nenhum** gift card é criado
- T2 (claim atômico) extraído em `claimAndIssue`, reusado pelo novo
  `completePendingOrder(orderId, issued)` — as garantias não são duplicadas

**Bônus — vazamento mais grave encontrado e corrigido**
`donations.service` contava estoque direto na tabela (`prisma.giftCard.count({status:'available'})`),
furando a abstração. Com um fornecedor por API isso retornaria **sempre 0 e rejeitaria
toda doação**. Agora usa `checkAvailability()` do provider da marca — que era exatamente
o método que existia no contrato e nunca era chamado.

**Provider `stub`** (`stubAsyncProvider.ts`) — fornecedor fictício **assíncrono**,
bloqueado em produção, para exercitar esse caminho antes de existir contrato real.

### 2.6 ✅ O que foi implementado (2.3 — reconciliação e alertas)

`giftCardOrders.reconcile.service.ts` varre pedidos em `processing`/`pending` e
tenta recuperar, do mais barato ao mais caro:

1. **Deriva** — a doação concluiu mas o pedido ficou atrás (crash entre o commit
   da transação e a marcação): só corrige o pedido, nada é comprado.
2. **Código já reclamado localmente** — o processo morreu depois de tirar o código
   do estoque e antes de concluir. **Reaproveita o código existente** em vez de
   comprar de novo (compra dupla = prejuízo + estoque furado).
3. **Fornecedor assíncrono** — consulta `fetchIssuedOrder` e conclui se já emitiu.

Se nada resolve e o pedido passou de `GIFT_CARD_ORDER_STALE_MINUTES` (default 15),
escala para `manual_review` **com alerta** e marca a doação também. A conclusão
sempre passa pelo mesmo `completePendingOrder` → mesmo claim atômico, sem
duplicar garantias.

**Alertas** — `shared/alerts/alert.service.ts` é o ponto único de emissão. Hoje
gera log estruturado JSON de uma linha (`kind:"alert"`, `event`, `severity`,
`context`), pronto para coletor. Eventos são uma **lista fechada** de tipos, então
alerta novo é decisão consciente. Nunca inclui código de gift card.
⚠️ **Ainda falta** encaminhar para Sentry/Slack — quando entrarem, só esse arquivo muda.

**Endpoint** `POST /admin/gift-card-orders/reconcile` (admin), aceitando
`{ staleMinutes?, limit? }`. ⚠️ **Em produção precisa de cron** — hoje é disparo manual,
mesma situação de `/payments/expire-overdue`.

**Verificado ponta a ponta** nos 5 cenários: conclusão por fornecedor assíncrono ·
recuperação de código órfão **sem criar cartão duplicado** · correção de deriva ·
escalada por janela estourada mantendo a família **não-alimentada** e emitindo o
alerta `gift_card_order_stale` · execução seguinte não reprocessa nada.

**Verificado ponta a ponta** (roteando `ifood` → `stub`): `purchase_pending` mantém a
família não-alimentada e sem gift card · order fica `processing` com `externalOrderId` ·
conclusão gera gift card **pelo caminho de provider por API** (não o do estoque) ·
código cifrado em repouso · segunda conclusão rejeitada (`order_already_issued`).

---

## 3. Revisão por área

### Pagamento
- [ ] `PAYMENT_PROVIDER=stripe` + chaves (boot já falha sem elas ✅)
- [ ] Endpoint de webhook registrado no Stripe com os 4 eventos (ver [`PAGAMENTOS-GOOGLE-PAY.md`](./PAGAMENTOS-GOOGLE-PAY.md))
- [ ] Confirmar que **nada** libera vale fora do webhook
- [ ] `rawBody` preservado — se alguém trocar o parser em `app.ts`, a assinatura quebra
- [ ] Cron de expiração de Pix (hoje é endpoint manual `/payments/expire-overdue`)
- [ ] Conciliação financeira: valor cobrado × custo do gift card × repasse

### Entrega do código (o "produto")
- [ ] `ENCRYPTION_KEY` com **backup seguro** e plano de rotação — perdê-la = perder
      todos os códigos (risco já marcado como crítico no roadmap)
- [ ] Confirmar que doador **nunca** vê o código; só o beneficiário
- [ ] Código não aparece em log, audit metadata, resposta de erro ou Sentry
- [ ] Política de expiração do código e o que acontece se expirar sem uso
- [ ] Reenvio de código (beneficiário perdeu o e-mail) sem gerar código novo

### Estoque (enquanto for manual)
- [ ] Alerta de **estoque baixo por marca** antes de zerar
- [ ] O que a UI faz quando o estoque acaba no meio da doação (hoje: pré-check na
      criação + `manual_review` no fulfillment — validar a mensagem ao doador)
- [ ] Processo humano documentado: quem compra, com que frequência, quem importa
- [ ] Conferência periódica: estoque no sistema × códigos realmente comprados

### Dados e privacidade
- [ ] Banco de **produção separado** do staging atual
- [ ] Dados de menores (LGPD art. 14) — base legal e minimização
- [ ] Backup automatizado + **teste de restore documentado**
- [ ] RLS: hoje habilitado sem policies, seguro porque o acesso é via API própria.
      Se algum dia o app falar direto com o Postgres, isso muda completamente

### Observabilidade (o que dói mais em produção)
- [ ] Logging estruturado + request-id
- [ ] Error tracking (Sentry)
- [ ] **Alertas** nos 4 eventos que significam dinheiro parado:
      webhook falhando · order em `manual_review` · order presa em `processing` ·
      estoque baixo
- [ ] Painel/consulta de `GiftCardOrder` por status (o `listOrders` já existe ✅)

### Testes (nenhum automatizado hoje)
- [ ] Vale só é liberado **após** pagamento confirmado
- [ ] 1 doação por família por ciclo (o claim atômico já cobre — precisa de teste)
- [ ] Webhook idempotente (evento duplicado não libera 2 vales)
- [ ] Código não é reutilizado
- [ ] Doador não vê código
- [ ] Falha do provider → `manual_review` **preservando** o código comprado

### Loja
- [ ] Ícone da marca ✅ (feito)
- [ ] Política de privacidade e exclusão de conta ✅ (in-app feito) — falta **URL pública**
- [ ] Enquadramento da ficha (ver seção 0)
- [ ] Build **AAB assinado** (keystore ✅) em vez de APK debug

---

## 4. Prioridade sugerida

| # | Item | Por quê agora |
|---|---|---|
| 1 | Definir enquadramento (seção 0) | Decide comissão de 15–30% e tributação; afeta tudo |
| 2 | **Cron da reconciliação + destino dos alertas** | A lógica existe e está testada, mas sem cron ninguém a dispara, e sem Sentry/Slack o alerta morre no log |
| 3 | Testes das 6 regras críticas | Sem eles, qualquer refactor pode liberar vale sem pagamento |
| 4 | Backup da `ENCRYPTION_KEY` | Incidente aqui é irreversível |
| ~~5~~ | ~~Registry por marca (2.1)~~ | ✅ feito |
| ~~6~~ | ~~Contrato assíncrono (2.2)~~ | ✅ feito |
| ~~7~~ | ~~Reconciliação + alertas (2.3)~~ | ✅ lógica feita — resta operacionalizar (item 2) |
