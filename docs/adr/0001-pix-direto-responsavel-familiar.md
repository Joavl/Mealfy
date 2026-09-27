---
status: accepted
---

# Substituir o vale-presente por Pix direto ao responsável familiar

O fluxo destinado a famílias deixará de cobrar o doador pela conta da plataforma e converter o valor em vale-presente. A Mealfy facilitará uma transferência Pix estática diretamente ao único responsável adulto da família, porque esse modelo dá autonomia à família e elimina custódia, repasse e fulfillment de vales; a plataforma registrará somente a intenção, a declaração do doador e a confirmação declaratória da família, sem afirmar que verificou a liquidação bancária.

## Opções consideradas

- **Manter gateway e vale-presente:** oferece webhook e confirmação financeira, mas preserva custódia operacional indireta, estoque, fornecedores e escolha limitada de uso.
- **Operar os dois modelos:** amplia escolha, porém duplica estados, comunicação, conciliação, suporte e risco de o usuário confundir quem recebe o dinheiro.
- **Pix direto ao responsável:** escolhido por ser o fluxo mais simples para doador e família e por transferir diretamente ao destinatário pretendido, aceitando como contrapartida a ausência de confirmação bancária pela Mealfy.

## Consequências

- Somente chave aleatória Pix (EVP) do responsável poderá ser usada; validação local de formato nunca será chamada de verificação de titularidade.
- A chave passará por revisão presencial, será criptografada e aparecerá apenas em sessão autenticada e curta; o banco do doador continua sendo a fonte autoritativa do nome do titular.
- “Já realizei o Pix” será uma declaração idempotente. A família deverá confirmar o recebimento, e os estados públicos evitarão “pagamento confirmado” ou “verificado pela Mealfy”.
- A plataforma não emitirá recibo fiscal, não contará autodeclarações em ranking ou totais financeiros e não prometerá estorno de uma transferência direta.
- O fluxo antigo ficará somente para leitura e liquidação de obrigações anteriores, protegido por controle de rollout durante uma janela curta, e será removido após estabilização.
- Dados reais só poderão entrar após definição da controladora, base legal, retenção, termos, operação, segurança e resposta a incidentes.

A especificação executável da decisão está em [Pix direto ao responsável familiar](../specs/pix-direto-responsavel-familiar.md).
