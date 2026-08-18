# Arquitetura Mealfy Backend

O projeto segue o padrão de **Monolito Modular**, onde cada domínio de negócio (Module) é isolado, mas compartilha a mesma infraestrutura.

## Camadas

### 1. Controllers / Routes
- Responsáveis por receber a requisição HTTP.
- Validam a entrada usando **Zod**.
- Chamam os serviços necessários.
- Retornam a resposta formatada.

### 2. Services
- Onde reside a **Regra de Negócio**.
- Exemplo: Cálculo do valor da doação, validação de região para conversão.
- Não sabem nada sobre Express ou HTTP.

### 3. Shared
- Contém middlewares (Auth, RoleGuard), Utilitários (Normalização) e Erros (AppError).
- Centraliza a lógica que atravessa múltiplos módulos.

### 4. Database (MockDatabase)
- Camada de persistência.
- Implementa métodos `read<T>` e `write<T>` para arquivos JSON.
- Garante a integridade da leitura e escrita assíncrona.

## Evolução para Produção
Esta arquitetura foi desenhada para facilitar a troca do `MockDatabase` por um ORM (como Prisma ou TypeORM) e um banco real (PostgreSQL/MongoDB) sem afetar os Controllers ou Middlewares.
