# Mock Data Persistence

Os dados estão armazenados em arquivos JSON dentro de `src/database/data/`.

## Arquivos
- `users.json`: Contas de doadores, entidades, beneficiários e admins.
- `entities.json`: Dados complementares das entidades autorizadoras.
- `families.json`: Beneficiários oficiais registrados.
- `indications.json`: Indicações feitas pela comunidade.
- `donations.json`: Registros de transações financeiras (mock).
- `giftcards.json`: Vouchers gerados para as famílias.
- `audit-logs.json`: Log de eventos críticos do sistema.

## Importante
- Ao reiniciar o servidor, os dados permanecem.
- Para resetar o banco, apague os arquivos na pasta `data/` ou rode `npm run seed`.
