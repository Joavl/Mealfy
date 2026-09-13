# Preparar entrega mobile e PWA

- **Prioridade:** média; alta para publicação em loja.
- **Objetivo:** produzir artefatos assinados e decidir formalmente o suporte PWA.
- **Contexto técnico:** Android CI gera debug APK; iOS é simulador unsigned; não há PWA configurada.
- **Escopo:** AAB assinado, iOS se aplicável, backup Android, code splitting/PWA e revisão de permissões.
- **Áreas afetadas:** workflows, Gradle, Capacitor, manifesto, `vite.config.ts`, assets e documentação.
- **Passos:** configurar segredos; gerar release; validar em dispositivo; ajustar backup; implementar/declinar PWA; testar carga inicial.
- **Dependências/pré-requisitos:** contas de loja, certificados e decisão de escopo iOS/PWA.
- **Critérios de aceite:** release é assinado e verificável; política de backup/sessão está segura; suporte PWA é comprovado ou não anunciado.
- **Riscos e validações:** não versionar keystore/certificados; testar upgrade e permissões reais.
