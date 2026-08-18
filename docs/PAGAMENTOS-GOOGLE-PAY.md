# Google Pay via Stripe — estado e o que falta

> **Google Pay não é um processador de pagamento.** É uma carteira: ela entrega um
> **cartão tokenizado** ao gateway. Quem cobra de fato é o Stripe. Por isso, no
> domínio, Google Pay = `PaymentMethod.card`.

## Fluxo (o backend nunca vê dados de cartão)

```
1. app     → POST /donations { familyId, amount, paymentMethod: "card" }
2. backend → cria PaymentIntent no Stripe, responde { payment, clientSecret }
3. app     → abre o Google Pay e confirma com o SDK do Stripe usando o clientSecret
4. Stripe  → POST /payments/webhook  (payment_intent.succeeded)
5. backend → status vira `paid` e SÓ ENTÃO o vale é liberado
```

O passo 5 reusa o mesmo caminho idempotente do Pix (`processWebhookEvent` →
`fulfillPaidDonation`). **A liberação do vale nunca acontece na resposta do passo 2** —
se acontecesse, daria para receber vale sem pagar.

## ✅ Pronto no código

| Item | Onde |
|---|---|
| `PaymentMethod.card` no schema + migration aplicada | `prisma/schema.prisma`, `migrations/20260725020000_add_card_payment_method` |
| Contrato do provider com cartão (opcional) | `payments/providers/paymentProvider.ts` |
| `StripeProvider` — cartão **e** Pix, webhook com `constructEvent` | `payments/providers/stripeProvider.ts` |
| Fábrica reconhece `PAYMENT_PROVIDER=stripe` | `payments/providers/index.ts` |
| `createCardChargeForDonation` | `payments/payments.service.ts` |
| `paymentMethod` na criação de doação (default `pix`) | `donations/donations.validator.ts`, `donations.controller.ts` |
| Webhook aceita o header `Stripe-Signature` | `payments/payments.controller.ts` |
| Boot falha se faltar chave com `PAYMENT_PROVIDER=stripe` | `config/env.ts` |
| Contrato no app (`paymentMethod`, `clientSecret`) | `src/api/donationsApi.ts` |

Enquanto `PAYMENT_PROVIDER=mock`, pedir `paymentMethod: "card"` responde
**501 `card_not_supported`** com instrução — nada quebra.

## ❌ O que falta (depende de você)

### 1. Conta Stripe + CNPJ
O Stripe Brasil exige **entidade brasileira (CNPJ)** para receber em BRL. É a mesma
pendência de PJ que já está no roadmap — sem ela não há como ativar.

### 2. Credenciais no `.env`
```
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
- `STRIPE_SECRET_KEY`: Dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET`: Developers → Webhooks → endpoint `POST {API}/payments/webhook`
  com os eventos `payment_intent.succeeded`, `payment_intent.payment_failed`,
  `payment_intent.canceled`, `charge.refunded` → copiar o *Signing secret*

Para testar local, o webhook precisa chegar na sua máquina:
`stripe listen --forward-to localhost:3000/payments/webhook`

### 3. Google Pay habilitado no Stripe
Dashboard → Settings → Payment methods → Google Pay. **Não existe chave separada do
Google** — o Stripe é o gateway que recebe o cartão tokenizado da carteira.

### 4. SDK no app (Capacitor) — ainda não instalado
Instalar `@capacitor-community/stripe` (ou o Stripe Android SDK) para abrir a
carteira. Não instalei ainda porque exige mudanças no projeto nativo e não dá
para verificar sem as chaves. Depois de instalar:
- inicializar com a **publishable key** (`pk_...`, essa pode ir para o app)
- checar disponibilidade do Google Pay no aparelho e só então mostrar o botão
- confirmar com o `clientSecret` devolvido pelo backend

### 5. Requisitos da marca Google Pay
Botão precisa seguir as *Brand Guidelines* do Google Pay (formato, cor, área livre)
para passar na revisão da Play Store.

## Cuidados

- **`clientSecret` não é persistido nem logado** — é efêmero e só serve ao dispositivo.
- **Idempotência**: a criação usa `idempotencyKey` por `donationId`, evitando cobrança
  duplicada se o app repetir a requisição.
- **Webhook precisa do corpo bruto**: já garantido por `express.json({ verify })` em
  `app.ts`. Se alguém trocar o parser, a verificação de assinatura quebra.
- **Valores em centavos** (`amount: 3500` = R$ 35,00), consistente com o resto do domínio.
