# Especificação de achados arquiteturais — Mealfy

> **Tipo:** revisão arquitetural baseada exclusivamente na inspeção do repositório e da documentação disponível.  
> **Escopo:** aplicação React/Vite/Capacitor, API Express/Prisma/PostgreSQL, automação de build e documentação.  
> **Não escopo:** esta especificação não implementa alterações, não valida comportamento em execução e não substitui testes de segurança, carga ou homologação operacional.

---

## 1. Objetivo

Consolidar os achados da revisão arquitetural em um plano acionável, priorizado e rastreável. O foco é preservar a evolução sustentável do Mealfy como **monólito modular**, reforçando:

- uma fonte de verdade inequívoca para dados de negócio;
- segurança e revogação efetiva de acesso;
- robustez dos fluxos financeiros e de fulfillment;
- testabilidade e reprodutibilidade de builds;
- documentação consistente com o código;
- responsabilidades claras entre app, API, infraestrutura e ferramentas de desenvolvimento.

A recomendação **não** é migrar para microserviços. No estágio atual, o backend modular em Express/Prisma é uma base proporcional ao produto. O objetivo é fortalecer fronteiras internas, contratos e operação.

---

## 2. Arquitetura observada

### 2.1 Componentes principais

| Componente | Tecnologia / localização | Responsabilidade observada |
|---|---|---|
| Aplicação cliente | `src/` — React 19, TypeScript, Vite | UI, roteamento por papel, estado de interface, integração HTTP e, transitoriamente, mocks/fallback local. |
| Adaptador mobile | `capacitor.config.ts`, `android/` | Empacota o bundle web como aplicação Android; há pipeline de compilação iOS não assinado. |
| API | `backend/src/` — Express, TypeScript | Autenticação, autorização, regras de negócio, persistência, pagamentos, gift cards, famílias e administração. |
| Persistência | `backend/prisma/` — Prisma/PostgreSQL | Schema, migrations e seed de ambientes não produtivos. |
| Integrações | módulos de pagamentos, OAuth e providers de gift card | Adaptam provedores externos e fluxos assíncronos de pagamento/fulfillment. |
| Automação | `.github/workflows/`, `build-android.sh` | Compilação Android/iOS e build Android manual. |
| Documentação | `docs/`, `backend/*.md`, `ANDROID_BUILD.md` | Registra arquitetura, operação, mocks, readiness e procedimentos de build. |

### 2.2 Decisões arquiteturais adequadas a preservar

1. **Monólito modular no backend.** Os módulos de autenticação, doações, pagamentos, gift cards, famílias, entidades, regiões, ranking e administração possuem separação de domínio apropriada ao estágio atual.
2. **Composição de aplicação separada do processo HTTP.** `createApp()` em `backend/src/app.ts` permite criar a aplicação sem iniciar porta; `server.ts` concentra o ciclo de vida do processo.
3. **Camadas de transporte e regra de negócio.** Rotas/controladores, validação, serviços, middlewares e utilitários compartilhados são uma estrutura adequada para Express.
4. **Backend como autoridade pretendida para regras críticas.** O backend possui máquinas de estado, transações e mecanismos de concorrência para pagamentos, doações e gift cards.
5. **Defesas de segurança já incorporadas.** Helmet, CORS configurável, rate limiting, JWT, RBAC, criptografia AES-256-GCM e webhook idempotente são boas fundações.
6. **Encapsulamento nativo com Capacitor.** Manter um único app React/Vite e usar Capacitor para Android/iOS evita duplicação prematura de código.

---

## 3. Convenções desta especificação

### 3.1 Status da constatação

| Status | Significado |
|---|---|
| **Confirmado** | Há evidência direta em arquivo ou documentação do repositório. |
| **Requer validação** | A evidência indica risco, mas é necessário verificar configuração, execução, ambiente ou requisito de negócio para confirmar seu efeito real. |
| **Recomendação preventiva** | Não representa falha comprovada; reduz risco ou protege a evolução futura. |

### 3.2 Prioridades

| Prioridade | Critério |
|---|---|
| **Alta** | Afeta segurança, integridade financeira, confiabilidade de dados, entrega ou validação de mudanças críticas. Deve entrar no plano antes de produção. |
| **Média** | Afeta operação, manutenibilidade, escalabilidade ou previsibilidade. Deve ser planejada no ciclo de estabilização. |
| **Baixa** | Melhoria de higiene, convenção ou preparação para crescimento. Pode ser tratada de modo incremental. |

---

## 4. Achados prioritários

## 4.1 Alta — Consolidar a fonte de verdade entre API e mocks locais

- **Área afetada:** `src/backend/services/*`, `src/backend/utils/fallback.ts`, `src/context/AppContext.tsx`, `src/hooks/useAdminData.ts`.
- **Status da constatação:** Confirmado.
- **Evidências:**
  - `src/backend/utils/fallback.ts` permite fallback local, exceto quando `VITE_DISABLE_LOCAL_FALLBACK` é igual a `true`.
  - Serviços de famílias, doações, ranking, comunidades e administração tratam falhas de API retornando a dados mockados ou persistidos no navegador.
  - `src/hooks/useAdminData.ts` inicializa entidades, famílias e usuários com seeds locais, persiste alterações em `localStorage` e usa `fireAndForget` para chamadas de mutação.
  - `src/context/AppContext.tsx` atualiza perfil e preferências localmente antes de confirmar persistência remota.
  - `src/backend/services/donationService.ts` mantém um caminho local que pode gerar gift card e marcar uma família como atendida quando a API não é utilizada.
- **Problema arquitetural:** Dados de domínio podem coexistir em duas fontes de verdade: API/PostgreSQL e armazenamento local do navegador. Parte dessas fontes contém regras e transições de estado próprias.
- **Impacto potencial:**
  - estados divergentes entre dispositivos ou sessões;
  - interface reportando sucesso para uma mutação não confirmada pelo servidor;
  - suporte e diagnóstico mais difíceis;
  - comportamento diferente entre ambiente web, APK, demo e ambiente integrado;
  - risco inaceitável se fallback atingir operações financeiras ou administrativas fora de desenvolvimento.
- **Recomendação:**
  1. Definir uma matriz por domínio com as fontes autorizadas para `demo`, `development`, `staging` e `production`.
  2. Isolar mocks em adaptadores explicitamente injetados por ambiente, em vez de deixá-los como caminhos alternativos dentro do mesmo serviço de negócio.
  3. Proibir fallback local para autenticação, RBAC, administração, doação, pagamento, reserva/entrega de vale e dados de famílias em staging/produção.
  4. Para mutações, modelar estados de interface como `pending`, `confirmed` e `failed`; atualizar o estado durável somente após confirmação da API ou aplicar atualização otimista com rollback explícito.
  5. Remover gradualmente dados locais que duplicam entidades persistidas, mantendo apenas cache descartável e dados de experiência de uso não críticos.
- **Critérios de aceite arquitetural:**
  - Cada fluxo possui uma única fonte de verdade identificada por ambiente.
  - Operações críticas não mostram estado concluído sem confirmação do backend.
  - O APK e a web de produção não conseguem ativar sem querer o modo mock por indisponibilidade da API.
  - O modo demonstração permanece possível, porém sem compartilhar persistência, identidade ou transições com a operação real.
- **Justificativa da prioridade:** A integridade de doações, famílias, administração e benefícios depende de estado autoritativo e consistente.

---

## 4.2 Alta — Garantir revogação efetiva de sessões e status atual de conta

- **Área afetada:** `backend/src/shared/middlewares/authGuard.ts`, `backend/src/shared/middlewares/roleGuard.ts`, `backend/src/shared/utils/jwt.ts`, módulos administrativos de usuários.
- **Status da constatação:** Confirmado.
- **Evidências:**
  - `authGuard` extrai `userId` e `role` do JWT validado e preenche `req.auth` sem consultar o usuário atual no banco.
  - `roleGuard` decide autorização pelo papel contido em `req.auth`.
  - `JWT_EXPIRES_IN` possui padrão de `7d` em `backend/src/config/env.ts`.
  - A arquitetura prevê bloqueio/suspensão de contas e alterações administrativas de estado.
- **Problema arquitetural:** A autorização de uma requisição depende de uma informação de papel emitida no passado. Um token válido poderá conservar privilégios após bloqueio, suspensão, exclusão ou alteração de papel, até expirar.
- **Impacto potencial:**
  - acesso prolongado de conta bloqueada ou suspensa;
  - manutenção indevida de privilégios administrativos;
  - dificuldade de responder a incidente de credencial comprometida;
  - exposição de dados sensíveis e códigos de benefício.
- **Recomendação:** Definir e implementar uma política de ciclo de vida de sessão. Alternativas aceitáveis incluem:
  - access token curto e refresh token revogável;
  - `sessionVersion` ou `tokenVersion` persistida no usuário e validada em endpoints protegidos;
  - lista de sessões revogadas ou store de sessões;
  - revalidação de usuário, status e papel no banco para operações de maior privilégio;
  - invalidação de todas as sessões quando houver reset de senha, bloqueio, mudança de papel ou incidente de segurança.

  A decisão deve documentar custo de consulta, requisitos de revogação e política de expiração.
- **Critérios de aceite arquitetural:**
  - Bloqueio/suspensão invalida ou impede o uso de sessões existentes dentro de janela documentada.
  - Alteração de papel não mantém privilégios antigos.
  - Há revogação de sessão para reset de senha e incidente de segurança.
  - Testes de integração cobrem token válido de usuário bloqueado, suspenso e com papel alterado.
- **Justificativa da prioridade:** É uma lacuna direta entre o modelo administrativo de contas e a efetividade da autorização em sessão.

---

## 4.3 Alta — Criar estratégia de testes automatizados e CI do backend

- **Área afetada:** `backend/package.json`, `.github/workflows/`, módulos de autenticação, doações, pagamentos, gift cards e famílias.
- **Status da constatação:** Confirmado.
- **Evidências:**
  - `backend/package.json` contém build, typecheck, migrations e seed, mas não há script de testes.
  - Não foram encontrados testes de aplicação versionados fora de dependências de terceiros.
  - Os workflows presentes são `android-build.yml` e `ios-build.yml`; não há pipeline observável para backend.
  - `docs/PRODUCAO-READINESS.md` também registra ausência de testes automatizados e CI/CD do backend.
- **Problema arquitetural:** Regras que protegem dinheiro, estoque, privacidade e acesso não possuem barreira de regressão automatizada no repositório.
- **Impacto potencial:**
  - regressão no fluxo “pagamento confirmado antes de liberar vale”;
  - quebra de idempotência de webhooks;
  - reuso de gift cards ou múltiplos atendimentos por ciclo;
  - regressões de serialização por papel e RBAC;
  - entrega de mudanças com typecheck/build, mas sem validação comportamental.
- **Recomendação:** Instituir uma pirâmide inicial de testes:

  1. **Unitários de domínio:** máquina de estados de doação/pagamento, escolha de provider, regras de elegibilidade, normalização e serialização.
  2. **Integração com PostgreSQL isolado:** transações, constraints, concorrência, reserva/uso de gift cards e regra de atendimento por ciclo.
  3. **HTTP/API:** login, token, RBAC, dados visíveis por papel, endpoints administrativos e webhooks.
  4. **Contratos front–backend:** DTOs e erros críticos para evitar mapeamentos silenciosamente incompatíveis.
  5. **CI obrigatório:** typecheck, testes e build para app e backend, com artefatos e logs úteis para diagnóstico.

  Os primeiros testes devem cobrir invariantes de maior impacto, não métricas genéricas de cobertura.
- **Cenários mínimos obrigatórios:**
  - pagamento não confirmado não libera gift card;
  - evento de webhook repetido não conclui duas vezes;
  - família não recebe dois atendimentos no mesmo ciclo;
  - um código não é atribuído a duas doações;
  - doador nunca recebe código em claro;
  - beneficiário não acessa código de outra família;
  - entidade só gerencia família sob sua responsabilidade;
  - administrador bloqueado não continua autorizado após a política de revogação.
- **Critérios de aceite arquitetural:**
  - O backend possui comando de teste documentado e executado no CI.
  - Pull requests não passam sem typecheck, testes e build dos componentes alterados.
  - Casos críticos acima possuem cobertura automatizada de regressão.
- **Justificativa da prioridade:** A qualidade do backend precisa ser verificável continuamente antes de operar fluxos de pagamento e benefício.

---

## 4.4 Alta — Tornar builds e dependências reproduzíveis

- **Área afetada:** `package.json`, `backend/package.json`, `.github/workflows/android-build.yml`, `.github/workflows/ios-build.yml`, documentação de build.
- **Status da constatação:** Confirmado.
- **Evidências:**
  - Os workflows Android e iOS usam `npm ci`.
  - Não foram encontrados lockfiles versionados na raiz nem em `backend/`.
  - As dependências usam intervalos de versão (`^` e `~`).
  - A documentação de requisitos locais não coincide integralmente com o workflow: `ANDROID_BUILD.md` menciona Node 18+ e JDK 17+, enquanto o CI usa Node 22 e Java 21.
- **Problema arquitetural:** O CI declara instalação reprodutível com `npm ci`, mas falta o artefato de lock necessário. Sem lockfile, dependências transitivas podem ser resolvidas de forma diferente em momentos distintos.
- **Impacto potencial:**
  - falha imediata de CI;
  - builds diferentes entre estações e runners;
  - regressões causadas por atualização indireta de pacote;
  - impossibilidade de reproduzir um APK ou bundle usado em incidente.
- **Recomendação:**
  1. Escolher e documentar o gerenciador de pacotes oficial por pacote/projeto.
  2. Versionar lockfiles compatíveis com o gerenciador escolhido para raiz e backend.
  3. Fazer os workflows validarem que o lockfile está sincronizado com o manifesto.
  4. Fixar ou declarar versões suportadas de Node, Java, Gradle, Capacitor e ferramentas nativas.
  5. Avaliar cache de dependências no CI somente depois de garantir a chave baseada no lockfile.
- **Critérios de aceite arquitetural:**
  - Instalação limpa em CI e máquina nova resolve exatamente as versões esperadas.
  - `npm ci` ou comando equivalente funciona para cada pacote onde é usado.
  - Documentação e CI usam as mesmas versões mínimas/major de runtime.
- **Justificativa da prioridade:** Uma cadeia de entrega sem build reproduzível não é confiável, mesmo com código correto.

---

## 4.5 Alta — Separar formalmente o modo demonstração do caminho produtivo

- **Área afetada:** `src/backend/services/authProvider.ts`, `src/backend/services/authService.ts`, `src/backend/services/donationService.ts`, `src/hooks/useAdminData.ts`, `docs/MOCKS-PRODUCAO.md`.
- **Status da constatação:** Confirmado.
- **Evidências:**
  - `MockAuthProvider` armazena credenciais e sessão em `localStorage` e compara senha no cliente.
  - `authService.registerEntity` conserva caminho legado que utiliza a senha literal `123456` ao registrar entidade.
  - `donationService` conserva operações locais de liberação de gift card.
  - `useAdminData` possui operações de estado de usuário marcadas como locais por ausência de rota correspondente.
  - `docs/MOCKS-PRODUCAO.md` documenta extensamente mocks remanescentes.
- **Problema arquitetural:** Mecanismos de demonstração, prototipagem e compatibilidade convivem com adaptadores de produção no mesmo caminho de aplicação.
- **Impacto potencial:**
  - ativação não intencional de simulação em ambiente integrado;
  - manutenção duplicada de regras de negócio;
  - falsa confirmação de operações administrativas ou financeiras;
  - auditoria de segurança mais difícil, pois credenciais demo e caminhos reais coexistem.
- **Recomendação:** Criar uma fronteira explícita de produto e build:
  - **Demo:** dados sintéticos, identidade sintética, sem acesso ao backend operacional.
  - **Desenvolvimento integrado:** API de desenvolvimento/staging, sem fallback silencioso para operações críticas.
  - **Produção:** sem credenciais mock, seeds de demonstração ou caminhos de liberação local.

  A seleção deve ocorrer de forma explícita por configuração de build e ser visível na interface e nos logs. O ambiente de demonstração deve ser tratado como produto separado ou modo explicitamente declarado.
- **Critérios de aceite arquitetural:**
  - Não há senha demo ou fluxo de pagamento/gift card local no bundle de produção.
  - A API indisponível em produção resulta em erro operacional tratável, nunca em dados simulados.
  - O modo demo é identificável e não pode apontar para dados de produção.
- **Justificativa da prioridade:** A separação protege a integridade operacional e reduz risco de segurança.

---

## 4.6 Média — Atualizar e consolidar documentação arquitetural

- **Área afetada:** `README.md`, `backend/ARCHITECTURE.md`, `docs/BACKEND_AUDIT_AND_IMPLEMENTATION_PLAN.md`, `docs/PRODUCAO-READINESS.md`, `ANDROID_BUILD.md`.
- **Status da constatação:** Confirmado.
- **Evidências:**
  - O `README.md` raiz ainda contém conteúdo padrão do template React/Vite.
  - `backend/ARCHITECTURE.md` descreve persistência `MockDatabase` em JSON, enquanto a implementação atual possui Prisma/PostgreSQL.
  - Trechos de `docs/BACKEND_AUDIT_AND_IMPLEMENTATION_PLAN.md` registram um scaffold antigo incompatível com a estrutura atual de autenticação e persistência.
  - `docs/PRODUCAO-READINESS.md` declara ausência de Helmet e rate limiting, embora ambos estejam configurados em `backend/src/app.ts`.
  - `ANDROID_BUILD.md` não está alinhado ao runtime Java/Node usado em CI.
- **Problema arquitetural:** Não há uma fonte documental confiável e atual para o estado real da arquitetura.
- **Impacto potencial:**
  - onboarding lento;
  - deploy ou operação baseados em instruções desatualizadas;
  - esforço duplicado para descobrir o comportamento atual;
  - decisões técnicas tomadas com riscos já mitigados ou riscos não mais representados corretamente.
- **Recomendação:** Estabelecer uma documentação canônica e breve, composta por:
  - visão de componentes e seus limites;
  - fontes de verdade por ambiente;
  - contrato de deploy de app, API, banco, worker/scheduler;
  - requisitos de build e versões de ferramentas;
  - decisões arquiteturais em ADRs;
  - matriz de recursos implementados, mockados e planejados.

  Documentos históricos podem permanecer, mas precisam de cabeçalho claro de obsolescência e referência ao documento atual.
- **Critérios de aceite arquitetural:**
  - README aponta para a arquitetura atual e os comandos válidos.
  - Não há documento ativo que descreva `MockDatabase` como infraestrutura corrente se Prisma/PostgreSQL é o caminho vigente.
  - A documentação de prontidão reflete corretamente controles que já existem e lacunas ainda abertas.
- **Justificativa da prioridade:** A documentação influencia diretamente manutenção, segurança operacional e velocidade de evolução.

---

## 4.7 Média — Formalizar o componente de processamento assíncrono

- **Área afetada:** `backend/src/modules/payments/payments.service.ts`, `backend/src/modules/donations/donationFulfillment.service.ts`, reconciliação de pedidos de gift card e infraestrutura de deploy.
- **Status da constatação:** Confirmado.
- **Evidências:**
  - `expireOverduePayments()` expira cobranças por execução de endpoint administrativo e o comentário declara que, em produção, deve ser chamado por cron.
  - O fluxo de fulfillment possui estados pendentes, reconciliação e `manual_review` para falhas ou concorrência.
  - `.vercelignore` registra que uma cópia serverless do backend seria inadequada por ausência de scheduler e por características de rate limiting em memória.
- **Problema arquitetural:** Há lógica assíncrona relevante, mas não está especificado um componente operacional responsável por agendamento, retry, alertas e recuperação.
- **Impacto potencial:**
  - cobranças expiradas podem ficar pendentes;
  - pedidos de gift card podem permanecer sem reconciliação;
  - filas de revisão manual podem crescer sem visibilidade;
  - falhas parciais de fornecedores podem exigir intervenção ad hoc.
- **Recomendação:** Escolher e documentar um modelo operacional:
  - cron gerenciado pela plataforma;
  - worker dedicado;
  - sistema de filas quando o volume ou a necessidade de retry justificar;
  - scheduler externo autenticado para endpoints de manutenção.

  Definir para cada tarefa: frequência, idempotência, timeout, concorrência máxima, política de retry, critérios de escalonamento humano e métrica/alerta correspondente.
- **Critérios de aceite arquitetural:**
  - Expiração de pagamento e reconciliação possuem responsável de execução definido em produção.
  - Tarefas podem ser reexecutadas sem duplicar efeitos.
  - Casos `manual_review` possuem SLA, owner operacional e alerta.
- **Justificativa da prioridade:** Pagamentos e fulfillment dependem de continuidade operacional, não apenas de endpoints corretos.

---

## 4.8 Média — Adotar observabilidade e correlação operacional

- **Área afetada:** `backend/src/server.ts`, `backend/src/shared/middlewares/errorHandler.ts`, `backend/src/shared/alerts/alert.service.ts`, infraestrutura.
- **Status da constatação:** Confirmado.
- **Evidências:**
  - A aplicação usa principalmente `console.log`, `console.warn` e `console.error`.
  - A documentação de readiness identifica ausência de logging estruturado, error tracking e alertas.
  - Existem audit logs de domínio, mas eles não substituem telemetria de requisição, integrações e exceções.
- **Problema arquitetural:** Não há mecanismo observável para correlacionar uma requisição, pagamento, evento de webhook, doação, pedido de gift card e incidente técnico.
- **Impacto potencial:** Diagnóstico lento, baixa capacidade de auditoria operacional, dificuldade para detectar degradação e alto custo de suporte.
- **Recomendação:** Definir observabilidade mínima para produção:
  - logs estruturados em JSON;
  - identificador de correlação por requisição;
  - associação de IDs de `payment`, `donation`, `giftCardOrder` e provider quando aplicável;
  - rastreamento de exceções;
  - health/readiness checks;
  - métricas de taxa de erro, webhook, estoque, pendência e revisão manual;
  - alertas com owner e runbook.
- **Critérios de aceite arquitetural:**
  - Um incidente de pagamento pode ser rastreado por identificador sem depender de busca textual em logs.
  - Erros de integração são monitorados e alertados.
  - O time possui procedimentos documentados para os alertas mais críticos.
- **Justificativa da prioridade:** A robustez dos fluxos transacionais precisa ser comprovável durante a operação.

---

## 4.9 Média — Reforçar separação de responsabilidades no cliente

- **Área afetada:** `src/context/AppContext.tsx`, `src/backend/services/*`, `src/api/*`, `src/backend/types/index.ts`.
- **Status da constatação:** Confirmado.
- **Evidências:**
  - `AppContext` concentra sessão, usuário, comunidades, região, ranking, privacidade, perfil e favoritos.
  - A pasta `src/backend/` não corresponde ao backend executável; contém mocks, serviços cliente, tipos e utilitários de armazenamento.
  - Os serviços cliente combinam adaptadores HTTP, fallback, dados mockados, transformação de DTO e persistência local.
  - Alguns mapeamentos de fronteira usam `any` ou objetos simplificados.
- **Problema arquitetural:** As responsabilidades de estado de interface, caso de uso cliente, adaptador HTTP e fallback de desenvolvimento estão acopladas. A nomenclatura `src/backend/` aumenta ambiguidade sobre a fronteira entre cliente e servidor.
- **Impacto potencial:** Menor testabilidade, dependências implícitas, dificuldade de substituir mocks, maior chance de incompatibilidade entre DTO remoto e modelo de tela.
- **Recomendação:** Evoluir incrementalmente para organização explícita, sem reescrita ampla:
  - clientes HTTP e DTOs em uma camada de infraestrutura/API;
  - mapeadores de DTO separados;
  - casos de uso por domínio;
  - estado remoto separado de estado puramente visual;
  - mocks injetáveis em testes/desenvolvimento;
  - migração gradual de `src/backend/` para nomenclatura que reflita sua natureza de cliente/adaptadores.
- **Critérios de aceite arquitetural:**
  - Um fluxo pode ser testado com API simulada sem usar `localStorage` global.
  - Contratos remotos não exigem casts genéricos no componente de página.
  - O contexto global não cresce como agregador de todos os domínios futuros.
- **Justificativa da prioridade:** A medida reduz dívida estrutural antes que o front conecte todos os módulos reais da API.

---

## 4.10 Média — Definir política de upload e armazenamento de imagem

- **Área afetada:** `backend/src/app.ts`, atualização de perfil no front, infraestrutura de mídia.
- **Status da constatação:** Confirmado.
- **Evidências:**
  - O parser JSON da API aceita até `2mb`.
  - O comentário em `backend/src/app.ts` informa que o limite foi ampliado porque foto de perfil é enviada como data URL em `PATCH /me`.
  - O mesmo comentário recomenda upload para storage e persistência apenas de URL como evolução.
- **Problema arquitetural:** Mídia binária codificada em Base64 é transportada no mesmo canal JSON usado por comandos transacionais da API.
- **Impacto potencial:** Uso maior de banda e memória, latência mais alta, payload globalmente permissivo e aumento da superfície para abuso de endpoints JSON.
- **Recomendação:** Projetar fluxo de mídia dedicado:
  - storage de objetos e CDN;
  - upload direto com URL assinada quando aplicável;
  - validação de tamanho, MIME e conteúdo;
  - redimensionamento/normalização de imagem;
  - persistência de metadados e URL no backend;
  - política de retenção e exclusão coerente com LGPD.
- **Critérios de aceite arquitetural:**
  - A API de domínio não recebe data URLs de imagens em operações comuns.
  - Limites de tamanho e formatos são explícitos.
  - Arquivos podem ser removidos em atendimento a exclusão de conta/dados.
- **Justificativa da prioridade:** Não é bloqueador imediato, mas reduz custo e risco conforme o uso de mídia aumenta.

---

## 4.11 Baixa — Remover artefatos Android gerados do controle de versão

- **Área afetada:** `android/.gradle/`, `android/app/build/`, `.gitignore`.
- **Status da constatação:** Confirmado.
- **Evidências:** A inspeção de arquivos rastreados identificou 935 arquivos no total, sendo 571 em `android/.gradle/**` ou `android/app/build/**`.
- **Problema arquitetural:** Caches, intermediários e produtos de build estão versionados junto com código-fonte e configuração.
- **Impacto potencial:** Histórico Git maior, clones lentos, diffs ruidosos, conflitos e menor clareza entre fonte e artefato gerado.
- **Recomendação:** Planejar remoção controlada de artefatos gerados do índice Git e ampliar `.gitignore` para caches Gradle e outputs de build, preservando arquivos-fonte do projeto Android e wrapper necessário à reprodução.
- **Critérios de aceite arquitetural:**
  - Um clone limpo reproduz o build Android sem depender de outputs versionados.
  - Diffs de código não incluem caches e intermediários de Gradle.
- **Justificativa da prioridade:** É principalmente higiene de repositório; não bloqueia a segurança ou o domínio de negócio.

---

## 4.12 Baixa — Estabelecer política explícita para scripts Shell e ferramentas versionadas

- **Área afetada:** `build-android.sh`, `ANDROID_BUILD.md`, automação de desenvolvimento.
- **Status da constatação:** Confirmado para o escopo atual; recomendação preventiva para a padronização futura.
- **Evidências:**
  - Há somente um script Shell rastreado: `build-android.sh`.
  - Seu shebang é `#!/bin/bash`, não `#!/bin/sh`.
  - Não foram encontrados scripts de complementação de shell, wrappers para seleção de versão ou estrutura de CLI Shell própria.
- **Problema arquitetural:** Não há uma arquitetura POSIX Shell consolidada no repositório. Há apenas uma automação Bash pontual, sem convenção formal de portabilidade, tratamento de erro, versões ou responsabilidades.
- **Impacto potencial:** Baixo no estado atual. Se a automação crescer sem convenção, podem surgir diferenças entre Bash, `/bin/sh`, macOS e Linux, além de execução com versões inadequadas de ferramentas.
- **Recomendação:** Escolher e registrar uma política antes de expandir scripts:
  - **POSIX Shell:** usar `#!/bin/sh`, construções portáveis e validação de compatibilidade; ou
  - **Bash explícito:** usar `#!/usr/bin/env bash` ou caminho acordado, definir versão mínima e convenções como falha imediata, mensagens e diretório de execução.

  Documentar versões suportadas de Node, Java, Capacitor e SDKs. Não criar complementação de shell ou executor por versão específica sem necessidade recorrente de CLI humana.
- **Critérios de aceite arquitetural:**
  - Scripts existentes declaram interpretador e pré-requisitos reais.
  - A documentação de build coincide com os workflows.
  - Novos scripts seguem uma convenção única e verificável.
- **Justificativa da prioridade:** Não há requisito demonstrado para um ecossistema Shell maior; a padronização deve ser proporcional ao uso.

---

## 5. Riscos que exigem validação complementar

Os itens abaixo possuem indícios no repositório, mas precisam de verificação de ambiente, configuração ou execução antes de serem tratados como falhas comprovadas em produção.

| Tema | Hipótese / ponto a validar | Evidência disponível | Validação recomendada |
|---|---|---|---|
| CORS de produção | `CORS_ORIGIN` pode permanecer permissivo se ambiente de produção usar o default `*`. | `env.ts` define `*` como default; `app.ts` aceita esse valor. | Revisar variáveis do ambiente de staging/produção e exigir allowlist explícita fora de desenvolvimento. |
| Deploy de migrations | A migration pode ser executada concorrentemente se múltiplas réplicas iniciarem simultaneamente. | Docker executa `prisma migrate deploy` no `CMD`. | Validar estratégia da plataforma e definir etapa única de release/migration. |
| Scheduler | Endpoints de expiração e reconciliação podem não estar sendo chamados. | Código e docs indicam execução por cron; não foi encontrada configuração de cron no repositório. | Inspecionar plataforma de deploy e runbooks de operação. |
| Persistência de token nativo | A segurança efetiva do token no Android/iOS depende de `tokenStorage.ts` e de capacidades configuradas do Capacitor. | O app possui adaptador de token e Capacitor Preferences nas dependências. | Revisar armazenamento em dispositivo, limpeza de sessão e proteção de backup. |
| Segurança de OAuth | A robustez depende de credenciais, redirect URIs, audiences e configurações externas de provedores. | Há módulos OAuth e variáveis de ambiente. | Realizar revisão específica por provedor e testes de callback/token. |
| Backup e rotação de chave | A recuperação de `ENCRYPTION_KEY` e dados criptografados depende de processos externos ao repositório. | Criptografia é implementada; docs mencionam plano de backup/rotação como pendência. | Validar secret manager, backup de chave, acesso mínimo e procedimento de rotação. |

---

## 6. Roadmap recomendado

### Fase 0 — Decisões e baseline

1. Declarar ambientes e fontes de verdade.
2. Definir o gerenciador de pacotes e lockfiles.
3. Atualizar documentação canônica.
4. Definir política de sessão/revogação.
5. Definir mecanismo de scheduler/worker e operação de incidentes.

### Fase 1 — Segurança e confiabilidade mínima

1. Implementar revogação de sessão e testes de autorização.
2. Remover ou isolar caminhos mock de operações críticas em builds integrados/produtivos.
3. Criar testes de invariantes financeiros e de privacidade.
4. Adicionar pipeline de backend com typecheck, testes e build.
5. Instrumentar logs estruturados, correlação e rastreamento de exceções.

### Fase 2 — Consolidação de integração

1. Migrar os domínios restantes do front para API autoritativa.
2. Eliminar duplicação de estado entre `localStorage` e API.
3. Formalizar contratos de DTO e tratamento uniforme de erros.
4. Criar tarefas agendadas de expiração, reconciliação e alertas operacionais.

### Fase 3 — Evolução sustentável

1. Separar upload de mídia do JSON transacional.
2. Remover artefatos gerados do versionamento.
3. Consolidar a organização do cliente por domínio e adaptadores.
4. Padronizar scripts Bash/POSIX Shell somente se a automação crescer.

---

## 7. Fitness functions recomendadas

As seguintes verificações podem se tornar critérios contínuos de arquitetura:

| Categoria | Fitness function |
|---|---|
| Fonte de verdade | Em build de produção, nenhuma mutação de domínio crítico pode usar fallback local. |
| Segurança | Usuário bloqueado/suspenso não acessa endpoint protegido com token antigo além da janela definida. |
| Pagamentos | Um evento externo repetido não gera mais de uma conclusão ou entrega. |
| Gift cards | Um código hash só pode ser associado a uma entrega; código em claro não aparece em DTO de doador/admin. |
| Consistência | Uma família só pode ser marcada como atendida uma vez por ciclo. |
| Qualidade | PRs executam typecheck, testes e build de app/backend conforme a área alterada. |
| Reprodutibilidade | Instalação limpa em CI usa lockfile e produz build sem dependência de artefatos locais. |
| Operação | Jobs de expiração e reconciliação têm execução observável, idempotente e alertável. |
| Documentação | Mudança de infraestrutura, ambiente ou contrato relevante atualiza documento canônico/ADR na mesma entrega. |

---

## 8. Decisões a registrar em ADR

1. **Estratégia de sessões e revogação:** access/refresh token, store de sessão, revalidação e expiração.
2. **Política de ambientes e fallback:** como demo, desenvolvimento, staging e produção se comportam.
3. **Processamento assíncrono:** cron, worker, filas, retry e ownership operacional.
4. **Política de mídia:** storage, URLs assinadas, validação, retenção e exclusão.
5. **Gerenciador de pacotes e runtimes suportados:** lockfile, Node, Java, Gradle e Capacitor.
6. **Convenção de scripts:** POSIX Shell ou Bash, quando a automação justificar padronização.

---

## 9. Resultado esperado

Ao concluir as prioridades altas, o Mealfy deverá manter a simplicidade de um monólito modular, com ganhos concretos:

- dados críticos autoritativos no backend;
- sessões com revogação e autorização efetivas;
- regras financeiras e de entrega cobertas por testes;
- builds repetíveis e validáveis em CI;
- modos demo e produção sem ambiguidade;
- tarefas assíncronas operadas de forma confiável;
- documentação consistente e útil para desenvolvimento e operação.
