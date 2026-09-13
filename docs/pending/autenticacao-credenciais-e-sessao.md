# Autenticação, credenciais e sessão

## Prioridade: crítica

## Objetivo

Eliminar credenciais simuladas/fixas e garantir que apenas contas elegíveis obtenham sessão e privilégios operacionais.

## Estado observado

- `registerEntity()` envia `password: '123456'` ao cadastro real (`src/backend/services/authService.ts:217-225`) e cria dados de entidade localmente.
- Cadastro de beneficiário usa `MockAuthProvider` (`src/backend/services/authService.ts:149-155`).
- Credenciais mock são armazenadas em `localStorage` (`src/backend/services/authProvider.ts:8-10`, `191-198`).
- Reset de senha é mock (`src/backend/services/authService.ts:142-146`).
- Backend cria entidade como `pending`, mas emite JWT imediatamente (`backend/src/modules/auth/auth.service.ts:22-28`); login não bloqueia `pending` (`:41-46`).
- Token bearer é persistido pelo cliente, sem evidência de refresh/rotação/revogação.

## Escopo

- Remover senha fixa e credenciais locais da distribuição.
- Definir ativação segura: senha definida pelo usuário ou convite único, expirável e de uso único.
- Criar recuperação de senha com token seguro, expiração, uso único e canal de e-mail configurado.
- Bloquear ou limitar sessão de entidade pendente até aprovação.
- Implementar ciclo de sessão seguro compatível com web e nativo.
- Conectar OAuth do cliente a SDKs reais somente quando credenciais e plataforma estiverem configuradas; caso contrário, ocultar opções simuladas.

## Requisitos não funcionais

Não logar token, senha, código de reset ou segredo. Tokens devem ter expiração curta, refresh rotativo e revogação conforme o desenho adotado. No Android, revisar backup e armazenamento seguro.

## Critérios de aceite

- Não há senha hard-coded ou credencial mock acessível no cliente de produção.
- Entidade pendente não pode criar/editar famílias nem acessar operação de entidade.
- Reset de senha não revela existência de e-mail e não reutiliza token.
- Login social real só aparece quando a integração correspondente estiver configurada.
- Testes cobrem token expirado, revogado, conta bloqueada, entidade pendente e reset.

## Dependências

Provider de e-mail, credenciais OAuth quando aplicável, política de sessão e mudanças de schema/migrations se necessárias.
