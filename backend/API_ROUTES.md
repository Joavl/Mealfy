# API Routes - Mealfy

Base URL: `http://localhost:3001` (ou endereço do servidor de produção)

Todas as rotas de negócio possuem o prefixo `/api` e esperam o envio do ID Token do Firebase no cabeçalho `Authorization: Bearer <token>` (ou ID de usuário simulado em modo mock).

## 1. Autenticação e Usuários
* `POST /api/auth/register/donor`: Registro de doadores PF/PJ.
* `POST /api/auth/register/entity`: Registro de organizações parceiras (status inicial `PENDING`).
* `POST /api/auth/register/beneficiary`: Registro direto de beneficiários, criando a família correspondente.
* `POST /api/auth/login/mock`: Login simplificado para desenvolvimento/contas demo.
* `POST /api/auth/login/firebase`: Login validado com o ID Token do Firebase.
* `GET  /api/auth/me`: Retorna informações do usuário autenticado.
* `PATCH /api/auth/me/preferences`: Atualiza preferências de privacidade de impacto do doador.

## 2. Famílias
* `GET   /api/families/public`: Retorna a lista de famílias aprovadas e públicas (opcionalmente filtrada por região).
* `GET   /api/families/:id`: Detalhes completos de uma família específica.
* `POST  /api/families`: Cadastro de famílias (permitido apenas para Entidades aprovadas ou Administradores).
* `PATCH /api/families/:id/status`: Altera status de aprovação de famílias (apenas Administradores).
* `GET   /api/families/awaiting-entity`: Lista famílias pendentes de acolhimento por uma entidade.
* `PATCH /api/families/:id/assign-entity`: Vincula a entidade logada à família.

## 3. Indicações
* `POST  /api/indications`: Registra indicação de família necessitada (por doadores).
* `GET   /api/indications`: Lista todas as indicações pendentes (entidades/admins).
* `PATCH /api/indications/:id/status`: Altera status da indicação.
* `POST  /api/indications/:id/convert`: Valida indicação e a converte em uma família registrada no sistema.

## 4. Doações
* `POST /api/donations`: Realiza uma doação individual para uma família.
* `POST /api/donations/batch`: Realiza doações simultâneas para múltiplas famílias.
* `POST /api/donations/regional`: Realiza doação regional distribuída igualmente para famílias necessitadas.
* `GET  /api/donations/me`: Histórico de doações do doador autenticado.

## 5. Vouchers (Gift Cards)
* `GET  /api/giftcards/ifood/info`: Retorna instruções de resgate e links do provedor.
* `GET  /api/giftcards/family/:familyId`: Lista histórico de vouchers enviados à família.
* `GET  /api/giftcards/family/:familyId/active`: Retorna o voucher ativo/pendente de resgate da família.
* `POST /api/giftcards/:giftCardId/redeem`: Marca o voucher como resgatado (apenas beneficiários da família).

## 6. Utilitários, Ranking e Painéis
* `GET  /api/health`: Retorna status operacional da API.
* `GET  /api/ranking`: Retorna o quadro de líderes (ranking) de doadores ativos.
* `GET  /api/regions`: Retorna dados estatísticos de famílias e carências por região.
* `GET  /api/social/resolve/facebook`: Links de direcionamento da plataforma.
* `GET  /api/social/resolve/facebook/:userId`: Redirecionamento para o perfil público do doador (caso não anônimo).

## 7. Administração Central
* `GET  /api/admin/entities/pending`: Lista entidades pendentes de aprovação.
* `PATCH /api/admin/entities/:id/approve`: Aprova entidade no sistema.
* `PATCH /api/admin/entities/:id/reject`: Rejeita entidade no sistema.
* `GET  /api/admin/featured-donors`: Retorna IDs de doadores em destaque.
* `PUT  /api/admin/featured-donors`: Configura novos IDs de doadores em destaque.
* `GET  /api/admin/donors`: Lista todos os doadores para seleção de destaque.
