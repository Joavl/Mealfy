# Viabilidade de gift cards direcionados no Mealfy

**Data da pesquisa:** 14 de setembro de 2026

## Conclusão executiva

O modelo é viável se o Mealfy for camada de descoberta e orquestração, enquanto emissor/distribuidor cria e entrega o gift card. O doador deve pagar diretamente ao pedido do provedor ou a um merchant-of-record; Mealfy não deve manter saldo, carteira, valor resgatável ou transferir dinheiro à família.

**Recomendação:** iniciar nos EUA com gift cards fechados de supermercado/restaurante e entrega por e-mail/link, via fornecedor com MoR e cobrança por pedido confirmados. Expandir para Brasil/LatAm apenas após validação de catálogo por país, KYB e parecer jurídico local.

## Fornecedores e APIs

| Provedor | Evidência oficial | Cobertura/limitações |
|---|---|---|
| Tremendous | API single/multi-product, catálogo com 800+ opções, entrega por e-mail/link. [Docs](https://developers.tremendous.com/llms.txt) | Multi-product filtra por país e denominação. Fluxo típico usa balance; há funding por invoice. Confirmar MoR e evitar pré-funding pelo Mealfy. [Single](https://developers.tremendous.com/docs/creating-single-product-rewards.md) [Multi](https://developers.tremendous.com/docs/creating-multi-product-rewards-wip.md) |
| Runa | API de catálogo, pedidos, payout links; produção exige KYB/EDD e conta financiada. [Produção](https://developer.runa.io/getting-started/production.md) | Lista US, BR, AR, CL, CO, MX, PE e outros. Produtos do mesmo pedido devem ser de um só país; permite restringir SKUs. [Países](https://developer.runa.io/reference/countries.md) [Restrições](https://developer.runa.io/features/limiting-available-products.md) |
| Tango/BHN | API de rewards e catálogo global. O modelo tem Platform, Customer/Group e Account, onde fundos ficam e pedidos são feitos. [Docs](https://developers.tangocard.com/llms.txt) [Modelo](https://developers.tangocard.com/docs/organizational-model.md) | Adequado para escala B2B, mas exigir MoR e funding por pedido; não manter conta/saldo sob controle do Mealfy. |
| Giftbit | Site oficial declara API, 1.500+ marcas em 40+ países e prepaid em 150+ países. [Developer](https://www.giftbit.com/developer) | Confirmar por contrato marcas, supermercados/restaurantes, países, denominações e modelo de cobrança. |

## Mercados

- **EUA:** maior densidade de gift cards de supermercados, delivery e restaurantes; validar país, estado, canal online/loja, denominação e CEP.
- **Brasil:** Runa lista BR/BRL, mas isso não garante determinada marca ou disponibilidade contínua. Validar SKU, validade, resgate e suporte local.
- **LatAm:** Runa lista Argentina, Brasil, Chile, Colômbia, México e Peru; disponibilidade é produto-a-produto, não uniforme. Rollout por país/moeda.

## Regulação, KYC/AML e MoR

### Brasil

O Banco Central mantém páginas oficiais sobre [instituições de pagamento](https://www.bcb.gov.br/estabilidadefinanceira/instituicaopagamento) e [arranjos de pagamento](https://www.bcb.gov.br/estabilidadefinanceira/arranjospagamento), no contexto da Lei 12.865/2013 e regulamentação aplicável. Se o app recebe dinheiro, mantém saldo, paga terceiros ou emite instrumento próprio, pode entrar no perímetro regulado; obter parecer local. Mitigação: doador paga emissor/MoR; Mealfy não mantém fundos, não oferece cash-out, não faz câmbio e guarda somente status/ID do pedido.

### EUA

A regra CFPB [12 CFR 1005.20](https://www.consumerfinance.gov/rules-policy/regulations/1005/20/) disciplina gift cards, incluindo divulgações de validade/taxas e exceções. Se o fluxo transmitir ou armazenar valor em nome de terceiros, pode envolver money transmission/MSB. A [FinCEN](https://www.fincen.gov/resources/money-services-business-msb-registration) informa que, salvo exceções, MSBs devem se registrar e cumprir BSA. Parceiro como emissor/MoR reduz, mas não elimina, análise estadual/federal.

- Runa declara KYB e EDD necessários para produção; esperar onboarding semelhante em parceiros.
- Aplicar controles de cartão, velocity limits, antifraude, sanções e chargebacks; prepaid Visa/open-loop e cash-like payouts têm risco maior e devem ficar fora do MVP.
- Definir contratualmente quem é vendedor no recibo, responde por imposto, fraude, reembolso, suporte e reporte AML.

## Fluxo recomendado

1. Beneficiário escolhe marca/denominação disponível para seu país/localização.
2. Mealfy exibe preço, taxas, moeda, termos, validade e restrições.
3. Doador paga checkout do MoR/emissor; Mealfy recebe apenas confirmação/status.
4. Parceiro entrega diretamente ao beneficiário; Mealfy não recebe código nem mantém saldo.
5. Webhooks e ID idempotente atualizam pedido; cancelamento/reembolso seguem termos do emissor.

## Limites a comunicar

- Cartão é restrito à marca, país e moeda; não é saldo Mealfy.
- Denominações, validade, split, canais online/loja e taxas variam por SKU.
- Runa não aceita produtos de países diferentes no mesmo pedido.
- Alguns cartões não funcionam em MCCs específicos, recorrência, álcool, saque ou marketplaces.
- Disponibilidade deve ser consultada em tempo real; não prometer cobertura nacional sem validação por CEP.

## Checklist pré-piloto

- Confirmar MoR, cobrança, impostos, chargeback, fraude, suporte e reembolso.
- Obter catálogo com SKU, país, moeda, denominação, validade, restrições, canal e estoque.
- Confirmar cobrança por pedido/hosted checkout; rejeitar saldo pré-financiado mantido pelo Mealfy.
- Validar KYB/KYC, sanções, AML, LGPD, retenção e transferência internacional de dados.
- Testar duplicidade, webhook atrasado, e-mail inválido, chargeback, cartão resgatado e SKU indisponível.
- Obter parecer jurídico no Brasil e nos estados-alvo dos EUA.

## Recomendação final

MVP nos EUA, gift cards fechados, um catálogo bem coberto e MoR confirmado. Depois, piloto Brasil/LatAm via Runa/BHN por país, sem carteira interna, saldo genérico, Pix/transferência, Visa open-loop ou câmbio pelo Mealfy.

## Fontes primárias

- https://developers.tremendous.com/llms.txt
- https://developers.tremendous.com/docs/creating-single-product-rewards.md
- https://developers.tremendous.com/docs/creating-multi-product-rewards-wip.md
- https://developer.runa.io/llms.txt
- https://developer.runa.io/getting-started/production.md
- https://developer.runa.io/reference/countries.md
- https://developer.runa.io/features/limiting-available-products.md
- https://developers.tangocard.com/llms.txt
- https://developers.tangocard.com/docs/organizational-model.md
- https://www.giftbit.com/developer
- https://www.consumerfinance.gov/rules-policy/regulations/1005/20/
- https://www.fincen.gov/resources/money-services-business-msb-registration
- https://www.bcb.gov.br/estabilidadefinanceira/instituicaopagamento
- https://www.bcb.gov.br/estabilidadefinanceira/arranjospagamento

Nota: catálogo e termos mudam; isto é avaliação de viabilidade, não parecer jurídico.