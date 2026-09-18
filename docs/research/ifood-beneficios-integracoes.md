# Achados: iFood — benefícios e integrações para beneficiários

**Data de consulta:** 4 de setembro de 2026  
**Escopo:** fontes primárias oficiais do iFood. Esta nota separa fatos publicados de itens que dependem de validação comercial, de parcerias ou técnica. Não foram inferidos endpoints nem funcionalidades não documentadas publicamente.

## Resumo executivo

O iFood publica uma oferta de **iFood Benefícios** voltada a **empresas e seus colaboradores**: a empresa escolhe saldos e os envia aos colaboradores. Isso demonstra uma solução corporativa de benefícios e o fluxo público de vinculação/uso do cartão pelo colaborador.

Por outro lado, nas fontes oficiais públicas consultadas **não foi localizado** um endpoint, especificação OpenAPI, método de autenticação, webhook ou API pública verificável para emitir/distribuir gift cards, vouchers, cartões ou saldos a beneficiários. O portal oficial de desenvolvedores existe, mas a revisão pública não identificou documentação de uma API de iFood Benefícios ou de gift cards. Portanto, não é possível afirmar que uma integração programática exista, nem desenhar seus endpoints.

## O que é público e verificável

| Tema | Achado verificável | Fonte oficial |
| --- | --- | --- |
| Produto e público | O iFood descreve o iFood Benefícios como cartão multibenefícios para empresas; a empresa seleciona os saldos e os envia aos colaboradores. | [FAQ iFood Benefícios](https://beneficios.ifood.com.br/faq) |
| Saldos | A FAQ lista oito saldos: alimentação, refeição, mobilidade, cultura, educação, home office, saúde/bem-estar e saldo livre. Também identifica o cartão como Elo, na modalidade crédito. | [FAQ iFood Benefícios](https://beneficios.ifood.com.br/faq) |
| Contratação | O contato de contratação público solicita e-mail corporativo. A página declara taxa zero de adesão, administração, emissão e envio do cartão. | [Contato / self-sales](https://beneficios.ifood.com.br/contato-self-sales) |
| Cadastro e ativação | Para usar o benefício, o colaborador baixa o app, informa CPF e recebe código no e-mail corporativo. Para cartão sem nome, a vinculação exige o código entregue com o cartão e os quatro últimos dígitos. | [FAQ iFood Benefícios](https://beneficios.ifood.com.br/faq); [Vincular cartão](https://beneficios.ifood.com.br/vincular-cartao) |
| VA/VR | A FAQ informa aderência ao PAT para alimentação e refeição; esses saldos são segregados, de finalidades específicas, distintos e intransferíveis em relação aos demais saldos. | [FAQ iFood Benefícios](https://beneficios.ifood.com.br/faq) |
| Portal técnico | O iFood mantém um portal oficial para desenvolvedores. A mera existência do portal não documenta, por si, API de Benefícios/gift cards. | [iFood Developer](https://developer.ifood.com.br/) |

## Disponibilidade para o caso de uso proposto

### Há evidência pública

- Há oferta corporativa de benefícios, com empresa contratante e colaboradores como destinatários.
- Há fluxo público de distribuição/vinculação de cartão, inclusive para cartão sem nome, mas a documentação pública consultada não descreve automação por API.
- A página de self-sales é um canal público para iniciar a contratação.

### Não há evidência pública suficiente

- **Gift card ou voucher avulso** destinado a beneficiários externos, doadores, famílias ou outro público que não seja colaborador de empresa contratante.
- Emissão programática, recarga programática, criação de beneficiários, importação em massa ou consulta de saldos.
- API pública, SDK, OpenAPI/Swagger, endpoints, credenciais, escopos, autenticação, limites de uso, idempotência, webhooks ou SLA para iFood Benefícios/gift cards.
- Catálogo, preços, mínimos de contratação, elegibilidade, cobertura, prazo de emissão/entrega, expiração, estorno e regras de suporte aplicáveis ao cenário.

A ausência acima significa apenas que tais pontos **não estavam verificáveis nas páginas públicas oficiais revisadas**; não prova que não possam ser oferecidos contratualmente.

## O que confirmar diretamente com o iFood

Usar o canal de [contato/self-sales](https://beneficios.ifood.com.br/contato-self-sales) para solicitar envolvimento de Comercial/Parcerias iFood Benefícios e, se aplicável, do responsável técnico. Registrar a resposta e a documentação contratual antes de implementação.

1. **Modelo permitido:** confirmar se há gift card/voucher avulso ou distribuição de benefício a beneficiários externos. As fontes públicas comprovam somente o modelo empresarial para colaboradores.
2. **Elegibilidade e onboarding:** CNPJ e documentos exigidos, análise, mínimo de vidas, valores mínimos, prazo de ativação, regiões atendidas e custos efetivamente aplicáveis.
3. **Operação de beneficiários:** cadastro/importação em massa, atributos obrigatórios, cartões nominais versus sem nome, recargas, expiração, estorno, devolução e suporte ao destinatário.
4. **Integração, se houver:** acesso à documentação contratada, credenciais, ambiente de testes, autenticação, escopos, endpoints, quotas, idempotência, webhooks, observabilidade e SLA. Não implementar nem supor nenhum desses elementos antes de recebê-los oficialmente.
5. **Dados e conformidade:** papéis LGPD, base legal, DPA, retenção, transferência de dados, segurança e responsabilidades de atendimento.
6. **VA/VR e PAT:** para qualquer destinatário que não seja empregado, confirmar o enquadramento e as responsabilidades da contratante, pois a própria FAQ descreve particularidades de alimentação/refeição e PAT.

## Recomendação de próximo passo

Tratar iFood Benefícios como uma alternativa corporativa **a ser qualificada**, não como uma integração já disponível. Solicitar por escrito: (a) confirmação do caso de uso e público elegível; (b) proposta/contrato; e (c) documentação técnica, caso exista integração. Até essa confirmação, o produto deve prever operação manual ou um provedor alternativo com API pública comprovada, sem anunciar emissão automatizada por iFood.

## Fontes primárias oficiais

- iFood Benefícios — FAQ: https://beneficios.ifood.com.br/faq
- iFood Benefícios — Contato/self-sales: https://beneficios.ifood.com.br/contato-self-sales
- iFood Benefícios — Vincular cartão: https://beneficios.ifood.com.br/vincular-cartao
- iFood Developer: https://developer.ifood.com.br/

> Nota metodológica: páginas públicas podem mudar e alguns portais podem restringir acesso automatizado. Os achados são limitados ao conteúdo oficial acessível e verificável na data indicada; esta nota não é parecer jurídico, comercial ou contratual.
