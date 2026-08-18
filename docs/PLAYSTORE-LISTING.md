# Ficha da Play Store — Mealfy (rascunho para revisão)

Material-base para o cadastro no Play Console. Textos em pt-BR, dentro dos limites do Google.
**Revisar com o cliente antes de publicar** (nomes, região, e-mails e links definitivos).

---

## 1. Textos da ficha

### Nome do app
```
Mealfy — Combate à Fome
```
(máx. 30 caracteres)

### Descrição curta (máx. 80 caracteres)
```
Apoie famílias da sua região com vale-refeições via Pix. Simples e transparente.
```
(79 caracteres)

### Descrição completa (máx. 4.000 caracteres)
```
O Mealfy conecta você a famílias em insegurança alimentar na sua região —
de forma direta, transparente e segura.

🍽️ COMO FUNCIONA
• Escolha uma família mapeada por entidades sociais parceiras ou faça um
  Apoio Ampliado, que distribui seu valor entre as famílias de maior
  necessidade da região.
• Pague com Pix em poucos segundos.
• Seu apoio vira vale-refeições que a família resgata nos mercados e
  cozinhas parceiros.

📍 IMPACTO LOCAL E VISÍVEL
• Mapa interativo com as famílias sinalizadas perto de você.
• Ficha Pública de Impacto: acompanhe quanto você já apoiou, quantas
  refeições garantiu e sua posição no ranking (você controla sua
  visibilidade nas configurações).
• Patentes e medalhas: evolua de Iniciante a Guardião Alimentar Sênior.

🤝 REDE DE CONFIANÇA
• Famílias cadastradas e validadas por entidades sociais parceiras.
• Vale-refeições com código único, resgatáveis apenas pelo beneficiário.
• Operação auditada: cada apoio gera registro rastreável.

🔒 PRIVACIDADE E SEGURANÇA
• Pagamento via Pix, sem guardar seus dados bancários.
• Modo anônimo, controle de ranking e de Instagram nas suas mãos.
• Exclua sua conta e seus dados a qualquer momento, pelo próprio app.

Junte-se à rede que alimenta. Cada apoio vira prato cheio.

Baixe o Mealfy e combata a fome infantil na sua região.
```

### Notas da versão (release notes, máx. 500)
```
Primeira versão pública do Mealfy: apoios via Pix, mapa de famílias,
vale-refeições digitais, ranking de impacto e painel para entidades.
```

---

## 2. Categorização

| Campo | Valor sugerido |
|---|---|
| Categoria | **Estilo de vida** (alternativa: Social) |
| Tags | solidariedade, doação, comunidade, fome, impacto social |
| Classificação etária | **Livre** (sem conteúdo sensível; questionário IARC) |
| Público-alvo | 18+ (app movimenta dinheiro — declarar no questionário) |
| Anúncios | **Não contém anúncios** |
| Compras no app | **Não** (Pix é processado fora do Play Billing — doação beneficente, ver ROADMAP §3) |

---

## 3. Data Safety (formulário de segurança de dados)

Declarar no Play Console com base no que o app coleta DE FATO (conferir com a
política de privacidade em `/privacy`):

| Tipo de dado | Coletado? | Compartilhado? | Finalidade | Observação |
|---|---|---|---|---|
| Nome | Sim | Não | Funcionalidade do app | Cadastro |
| E-mail | Sim | Não | Funcionalidade + gerenciamento de conta | Login |
| IDs de usuário | Sim | Não | Funcionalidade | Interno/OAuth |
| Foto de perfil | Sim (opcional) | Não | Personalização | Upload pelo usuário |
| Localização aproximada | Sim (GPS aproximado no mapa + região de foco manual) | Não | Funcionalidade | Apenas COARSE — FINE_LOCATION removida do manifest |
| Histórico de apoios/doações | Sim | Não | Funcionalidade + contabilidade | Retenção legal |
| Dados de menores | **Não diretamente** | Não | — | Famílias são pseudonimizadas pelas entidades; declarar com cuidado no formulário |

Respostas padrão do formulário:
- Dados criptografados em trânsito? **Sim** (HTTPS).
- Usuário pode solicitar exclusão? **Sim** — dentro do próprio app (Perfil →
  Configurações → Excluir minha conta) — exigência da política 2024+.
- Coleta é opcional? Parcial (foto, Instagram, ranking são opt-in).

---

## 4. Credenciais de teste para a revisão do Google

O Google exige acesso de demonstração para apps com login. Antes do envio:
1. Criar conta de teste de cada papel no banco de PRODUÇÃO:
   - apoiador: `review.doador@mealfy.app`
   - entidade: `review.entidade@mealfy.app`
   - beneficiário: `review.beneficiario@mealfy.app`
   - admin: `review.admin@mealfy.app`
2. Senha forte única, anotada no campo "Instruções de acesso" do Play Console.
3. Sem Pix real na revisão: explicar no campo de instruções que o pagamento é
   manual e que a conta demo já tem histórico pré-carregado.

---

## 5. Assets gráficos pendentes

| Asset | Especificação | Status |
|---|---|---|
| Ícone do app | 512×512 PNG | Verificar `android/app/src/main/res` |
| Feature graphic | 1024×500 PNG | Pendente |
| Screenshots (mín. 2) | 1080×1920+ (telefone) | Pendente — tirar do build release |
| Política de privacidade (URL pública) | HTTPS acessível sem login | Texto pronto em `/privacy`; falta hospedar (após deploy) |

---

## 6. Checklist final antes de enviar para revisão

- [ ] AAB assinado com `mealfy-release.jks` (gerada em 22/07/2026, fora do git)
- [ ] `VITE_API_URL` apontando para a API de produção (após deploy Railway/Render)
- [ ] Contas demo criadas e testadas
- [ ] Texto final da política de privacidade aprovado pelo jurídico do cliente
- [ ] URL pública da política acessível
- [ ] Screenshots + feature graphic
- [ ] Data Safety preenchido conforme §3
- [x] Target SDK 35+ — verificado: **targetSdk 36**, minSdk 24 (`android/variables.gradle`)
