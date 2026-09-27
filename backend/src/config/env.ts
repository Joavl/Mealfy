import 'dotenv/config';
import { z } from 'zod';

/**
 * Espelham os enums `GiftCardProvider` (marca) e `GiftCardProviderName`
 * (fornecedor) do `schema.prisma`. Declarados aqui como literais para o config
 * não depender do client gerado do Prisma no boot — se um enum mudar no schema,
 * atualizar aqui também (o `switch` de `instantiate` no registry de providers
 * falha na compilação se um fornecedor novo não for tratado).
 */
const CARD_BRANDS = ['ifood', 'ninetynine', 'carrefour'] as const;
const GIFT_CARD_PROVIDER_NAMES = [
  'manual_inventory',
  'todo_incomm',
  'incentive_me',
  'ding_connect',
  'ifood_card',
  'stub',
] as const;

const cardBrandSchema = z.enum(CARD_BRANDS);
const giftCardProviderNameSchema = z.enum(GIFT_CARD_PROVIDER_NAMES);
const blankToUndefined = (value: unknown) => typeof value === 'string' && value.trim() === '' ? undefined : value;
const optionalString = z.preprocess(blankToUndefined, z.string().trim().min(1).optional());
const optionalEmail = z.preprocess(blankToUndefined, z.string().email().optional());
const optionalPort = z.preprocess(blankToUndefined, z.coerce.number().int().positive().optional());
const optionalStrictBoolean = z.preprocess(
  blankToUndefined,
  z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
);
const canonicalUuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  'Use UUID canônico minúsculo',
);
const csv = <T>(item: z.ZodType<T>) => z.string().transform((raw, ctx): T[] => {
  const parts = raw.split(',');
  if (parts.some((part) => part === '' || part !== part.trim())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Lista contém item vazio ou espaço inválido' });
    return z.NEVER;
  }
  const result = z.array(item).nonempty().safeParse(parts);
  if (!result.success) {
    for (const issue of result.error.issues) ctx.addIssue(issue);
    return z.NEVER;
  }
  if (new Set(result.data).size !== result.data.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Lista contém itens duplicados' });
    return z.NEVER;
  }
  return result.data;
});

type CardBrandName = (typeof CARD_BRANDS)[number];
type GiftCardProviderNameValue = (typeof GIFT_CARD_PROVIDER_NAMES)[number];

/**
 * Validação central das variáveis de ambiente.
 * Na fundação (Fase 1A) validamos apenas o núcleo da API.
 * DATABASE_URL e segredos passam a ser exigidos nas fases seguintes.
 */
const envSchema = z.object({
  // Deployment classification is deliberately independent from NODE_ENV.
  // It has no default: an unclassified process must never gain access to real data.
  APP_ENV: z.enum(['development', 'ci', 'demo', 'staging', 'production']),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('*'),
  // Banco — opcional na fundação; obrigatório a partir da Fase 1B em runtime real.
  DATABASE_URL: z.string().optional(),
  // Auth (Fase 2) — opcional no schema; o jwt util exige em runtime quando usado.
  JWT_SECRET: z.string().optional(),
  // Access tokens are intentionally short lived. Password resets additionally
  // invalidate tokens issued under older session versions.
  JWT_EXPIRES_IN: z.string().default('15m'),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(30),
  APP_URL: z.preprocess(blankToUndefined, z.string().url().optional()),
  SMTP_HOST: optionalString,
  SMTP_PORT: optionalPort,
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SMTP_FROM: optionalEmail,

  // Data egress is explicit. Non-production never sends unrestricted email.
  EMAIL_DELIVERY_MODE: z.enum(['capture', 'allowlist', 'smtp']),
  EMAIL_CAPTURE_DIR: optionalString,
  EMAIL_ALLOWLIST: z.preprocess(blankToUndefined, csv(z.string().email().transform((email) => email.toLowerCase())).optional()),

  // Direct Pix safety mode is explicit and has no permissive default.
  DIRECT_PIX_MODE: z.enum(['disabled', 'synthetic', 'live']),
  // Non-production synthetic mode accepts only these conspicuous fixtures and
  // can never produce a payable payload. Production live stays closed until all gates.
  DIRECT_PIX_SYNTHETIC_EVPS: z.preprocess(blankToUndefined, csv(canonicalUuid).optional()),
  DIRECT_PIX_CONTROLLER_APPROVED: optionalStrictBoolean,
  DIRECT_PIX_LEGAL_BASIS_APPROVED: optionalStrictBoolean,
  DIRECT_PIX_TERMS_APPROVED: optionalStrictBoolean,
  DIRECT_PIX_RETENTION_APPROVED: optionalStrictBoolean,
  DIRECT_PIX_OPERATIONS_APPROVED: optionalStrictBoolean,
  DIRECT_PIX_CONTROLLER_APPROVAL_REF: optionalString,
  DIRECT_PIX_LEGAL_BASIS_APPROVAL_REF: optionalString,
  DIRECT_PIX_TERMS_VERSION: optionalString,
  DIRECT_PIX_RETENTION_POLICY_VERSION: optionalString,
  DIRECT_PIX_OPERATIONS_RUNBOOK_REF: optionalString,
  // Gift cards (Fase 3) — 32 bytes em hex (64 chars); o crypto service valida o formato.
  ENCRYPTION_KEY: z.string().optional(),
  // Pagamentos (Fase 5) — `mock` só faz Pix fictício; `stripe` faz Pix e cartão
  // (cartão é o caminho do Google Pay / Apple Pay).
  PAYMENT_PROVIDER: z.enum(['mock', 'stripe']).default('mock'),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  PIX_EXPIRATION_MINUTES: z.coerce.number().int().positive().default(30),

  // Stripe — obrigatórios quando PAYMENT_PROVIDER=stripe (validado abaixo).
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Gift card provider (Fase 7) — só `manual_inventory` implementado; os demais
  // valores existem só como documentação de intenção (pendência comercial).
  // Este é o provider PADRÃO, usado por qualquer marca sem override abaixo.
  GIFT_CARD_PROVIDER: giftCardProviderNameSchema.default('manual_inventory'),

  /**
   * Override de provider POR MARCA — permite operar em modo misto durante a
   * transição para um fornecedor real (ex.: iFood por API, Carrefour por
   * estoque manual). Formato: `marca:provider,marca:provider`.
   *   GIFT_CARD_PROVIDER_BY_BRAND="ifood:ifood_card,carrefour:manual_inventory"
   * Marcas não listadas caem no GIFT_CARD_PROVIDER padrão.
   */
  /**
   * Quanto tempo um pedido pode ficar sem código antes de virar pendência
   * humana. Curto demais escala pedido que ia concluir sozinho; longo demais
   * deixa o doador esperando sem ninguém saber.
   */
  GIFT_CARD_ORDER_STALE_MINUTES: z.coerce.number().int().positive().default(15),

  GIFT_CARD_PROVIDER_BY_BRAND: z
    .string()
    .optional()
    .transform((raw, ctx) => {
      const map: Partial<Record<CardBrandName, GiftCardProviderNameValue>> = {};
      if (!raw?.trim()) return map;

      for (const pair of raw.split(',')) {
        const [rawBrand, rawProvider] = pair.split(':').map((s) => s?.trim());
        if (!rawBrand || !rawProvider) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Par inválido "${pair}". Use marca:provider (ex.: ifood:ifood_card).`,
          });
          continue;
        }
        const brand = cardBrandSchema.safeParse(rawBrand);
        if (!brand.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Marca desconhecida "${rawBrand}". Use: ${CARD_BRANDS.join(', ')}.`,
          });
          continue;
        }
        const provider = giftCardProviderNameSchema.safeParse(rawProvider);
        if (!provider.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Provider desconhecido "${rawProvider}" para a marca ${rawBrand}.`,
          });
          continue;
        }
        map[brand.data] = provider.data;
      }
      return map;
    }),

  // ─── Login social (Fase 8) ───────────────────────────────────────────────
  // Todos opcionais: cada provedor só é habilitado quando suas credenciais existem.
  // Sem credenciais, o endpoint responde 501 provider_not_configured (não quebra o boot).
  // Papel padrão de quem se cadastra via login social (nunca cria admin/beneficiary).
  OAUTH_DEFAULT_ROLE: z.enum(['donor', 'entity']).default('donor'),

  // Google — Client ID Web (usado para validar o `aud` do ID token vindo do app).
  GOOGLE_CLIENT_ID: z.string().optional(),

  // Facebook / Meta — App ID + secret (o secret monta o app-token de verificação).
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),

  // Apple — Services ID (client_id) usado como `aud` do ID token da Apple.
  APPLE_CLIENT_ID: z.string().optional(),

  // Gov.br — OIDC Authorization Code. Ambiente de homologação por padrão.
  GOVBR_CLIENT_ID: z.string().optional(),
  GOVBR_CLIENT_SECRET: z.string().optional(),
  GOVBR_REDIRECT_URI: z.string().optional(),
  GOVBR_ENV: z.enum(['staging', 'production']).default('staging'),
})
  // Dinheiro real não pode falhar na primeira doação por config faltando:
  // se o gateway ativo é o Stripe, exige as chaves já no boot.
  .superRefine((cfg, ctx) => {
    const issue = (path: keyof typeof cfg, message: string) => ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message,
    });

    if (cfg.APP_ENV === 'production') {
      if (cfg.DIRECT_PIX_MODE === 'synthetic') issue('DIRECT_PIX_MODE', 'Produção não aceita modo sintético');
      if (cfg.EMAIL_DELIVERY_MODE !== 'smtp') issue('EMAIL_DELIVERY_MODE', 'Produção exige entrega SMTP');
      for (const field of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'APP_URL'] as const) {
        if (!cfg[field]) issue(field, 'Entrega SMTP de produção exige configuração completa');
      }
      if (cfg.DIRECT_PIX_MODE === 'live') {
        const gates = [
          'DIRECT_PIX_CONTROLLER_APPROVED',
          'DIRECT_PIX_LEGAL_BASIS_APPROVED',
          'DIRECT_PIX_TERMS_APPROVED',
          'DIRECT_PIX_RETENTION_APPROVED',
          'DIRECT_PIX_OPERATIONS_APPROVED',
        ] as const;
        for (const gate of gates) {
          if (cfg[gate] !== true) issue(gate, 'Gate obrigatório para dados reais em produção');
        }
        for (const reference of [
          'DIRECT_PIX_CONTROLLER_APPROVAL_REF',
          'DIRECT_PIX_LEGAL_BASIS_APPROVAL_REF',
          'DIRECT_PIX_TERMS_VERSION',
          'DIRECT_PIX_RETENTION_POLICY_VERSION',
          'DIRECT_PIX_OPERATIONS_RUNBOOK_REF',
        ] as const) {
          if (!cfg[reference]) issue(reference, 'Aprovação de produção exige referência registrada');
        }
      }
    } else {
      if (cfg.DIRECT_PIX_MODE === 'live') issue('DIRECT_PIX_MODE', 'Modo live é proibido fora de produção');
      if (cfg.DIRECT_PIX_MODE === 'synthetic' && !cfg.DIRECT_PIX_SYNTHETIC_EVPS?.length) {
        issue('DIRECT_PIX_SYNTHETIC_EVPS', 'Modo sintético exige EVP sintética explícita');
      }
      if (cfg.EMAIL_DELIVERY_MODE === 'smtp') {
        issue('EMAIL_DELIVERY_MODE', 'SMTP irrestrito é proibido fora de produção');
      }
      if (cfg.EMAIL_DELIVERY_MODE === 'capture' && !cfg.EMAIL_CAPTURE_DIR) {
        issue('EMAIL_CAPTURE_DIR', 'Modo capture exige diretório local explícito');
      }
      if (cfg.EMAIL_DELIVERY_MODE === 'allowlist') {
        if (!cfg.EMAIL_ALLOWLIST?.length) issue('EMAIL_ALLOWLIST', 'Modo allowlist exige destinatários explícitos');
        for (const field of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'APP_URL'] as const) {
          if (!cfg[field]) issue(field, 'Modo allowlist exige transporte SMTP completo');
        }
      }
    }

    if (cfg.PAYMENT_PROVIDER === 'stripe') {
      if (!cfg.STRIPE_SECRET_KEY) issue('STRIPE_SECRET_KEY', 'Obrigatório quando PAYMENT_PROVIDER=stripe');
      if (!cfg.STRIPE_WEBHOOK_SECRET) {
        issue('STRIPE_WEBHOOK_SECRET', 'Obrigatório quando PAYMENT_PROVIDER=stripe (sem ele o webhook não é verificável)');
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
