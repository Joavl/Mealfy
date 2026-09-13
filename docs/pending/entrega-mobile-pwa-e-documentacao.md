# Entrega mobile, PWA e documentação

## Prioridade: média, com itens altos para publicação em loja

## Objetivo

Preparar artefatos distribuíveis e documentação operacional sem classificar build debug, conteúdo de template ou plataforma incompleta como release.

## Estado observado

- Android CI produz APK debug, não AAB assinado (`.github/workflows/android-build.yml:41-51`).
- iOS CI produz build unsigned de simulador (`.github/workflows/ios-build.yml:1-6`, `55-64`).
- `android:allowBackup="true"` está configurado enquanto o cliente persiste sessão; avaliar com a estratégia de segurança de tokens.
- Capacitor usa HTTPS Android e localização aproximada (`capacitor.config.ts`, manifesto).
- Não há evidência de PWA em `vite.config.ts`/`package.json`/`src/main.tsx`.
- Workflows usam tags de GitHub Actions, não SHA fixo.
- Há outputs de Gradle rastreados no repositório.
- README raiz é template Vite; documentos antigos em `backend/` ainda descrevem `MockDatabase`, embora `backend/README.md` diga que são obsoletos.

## Escopo

- Android: configurar assinatura, keystore sob secret, build AAB release e verificação de artefato.
- iOS, se estiver no escopo: versionar/provisionar projeto e configurar assinatura/TestFlight.
- Revisar backup Android e armazenamento de dados sensíveis.
- Decidir e implementar PWA, ou registrar que a entrega é apenas Capacitor.
- Fixar actions por SHA e revisar permissões do workflow.
- Remover artefatos gerados do versionamento e atualizar ignores.
- Substituir README template e consolidar documentos contraditórios.

## Critérios de aceite

- Artefato de release verificável e assinado é produzido para cada loja incluída no escopo.
- Não há outputs de build rastreados.
- A documentação principal descreve instalação, ambientes, backend, build, deploy, testes e limitações reais.
- A postura de backup e sessão Android é documentada e testada.

## Dependências

Credenciais de loja, certificados/keystore, política de publicação e decisão explícita de suporte a PWA/iOS.
