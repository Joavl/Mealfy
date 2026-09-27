# Dados sintéticos e segurança por ambiente

A API exige `APP_ENV` explícito (`development`, `ci`, `demo`, `staging` ou `production`) e `DIRECT_PIX_MODE` (`disabled`, `synthetic` ou `live`). Ela falha antes de iniciar quando a classificação, o modo ou controles obrigatórios estão ausentes ou contraditórios.

## Ambientes não produtivos

- Não use cópia não anonimizada da base produtiva. O fluxo oficial de testes sobe um PostgreSQL vazio pelo `compose.yaml`, aplica migrations e cria apenas fixtures locais.
- Cadastros e alterações HTTP de dados familiares reais retornam `423 real_family_data_forbidden`.
- Somente EVP canônicas listadas em `DIRECT_PIX_SYNTHETIC_EVPS` são aceitas pela política de segurança.
- Uma EVP sintética nunca gera BR Code. Apresentações usam `payable: false`, formato `mealfy-test-v1` e prefixo `MEALFY-NONPAYABLE:`, que é inequivocamente não pagável.
- `EMAIL_DELIVERY_MODE=capture` grava a mensagem numa caixa postal local indicada por `EMAIL_CAPTURE_DIR`, com permissões restritas e sem egress de rede ou logs. `allowlist` permite somente destinatários exatos de `EMAIL_ALLOWLIST`; SMTP irrestrito é recusado no boot.
- Endereços de fixture devem usar o domínio reservado `example.test` e nomes claramente marcados como sintéticos.

## Produção

Produção pode iniciar com `DIRECT_PIX_MODE=disabled` e o fluxo fechado. Para `live`, exige `EMAIL_DELIVERY_MODE=smtp`, configuração SMTP completa e mantém coleta/revelação de EVP fechada até que todos estes gates sejam literalmente `true`: controladora, base legal, termos, retenção e operação. Cada aprovação também precisa de uma referência ou versão registrada. Configuração ausente, parcial, falsa ou inválida encerra o processo antes de escutar uma porta.

As recusas usam códigos estáveis e não incluem EVP, nome civil, payload Pix ou corpo da requisição. Esses valores também não devem aparecer em logs, analytics ou ferramentas de erro.
