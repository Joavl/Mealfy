# API Routes - Mealfy

Base URL: `http://localhost:3000`

## Auth
- `POST /auth/register/donor`: Registro de doador PF/PJ.
- `POST /auth/register/entity`: Registro de entidade (status inicial pending).
- `POST /auth/login/mock`: Login simulado.
- `GET /auth/me`: Retorna dados do usuário autenticado.

## Families
- `GET /families/public`: Famílias aprovadas e visíveis.
- `GET /families/:id`: Detalhes da família (Privado).
- `POST /families`: Cadastro oficial (Apenas Entidade Approved ou Admin).
- `PATCH /families/:id/status`: Alterar status (Apenas Admin).

## Indications
- `POST /indications`: Criar indicação (Doador).
- `GET /indications`: Listar todas (Entidade/Admin).
- `POST /indications/:id/convert`: Converter em família oficial.

## Donations
- `POST /donations`: Doação individual.
- `POST /donations/batch`: Doação em lote.
- `GET /donations/me`: Histórico do doador.

## Ranking
- `GET /ranking`: Ranking global respeitando privacidade.

## Admin
- `GET /admin/entities/pending`: Listar entidades aguardando aprovação.
- `PATCH /admin/entities/:id/approve`: Aprovar entidade.
- `PATCH /admin/entities/:id/reject`: Rejeitar entidade.
