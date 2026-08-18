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

type CardBrandName = (typeof CARD_BRANDS)[number];
type GiftCardProviderNameValue = (typeof GIFT_CARD_PROVIDER_NAMES)[number];

/**
 * Validação central das variáveis de ambiente.
 * Na fundação (Fase 1A) validamos apenas o núcleo da API.
 * DATABASE_URL e segredos passam a ser exigidos nas fases seguintes.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('*'),
  // Banco — opcional na fundação; obrigatório a partir da Fase 1B em runtime real.
  DATABASE_URL: z.string().optional(),
  // Auth (Fase 2) — opcional no schema; o jwt util exige em runtime quando usado.
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
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
    if (cfg.PAYMENT_PROVIDER !== 'stripe') return;
    if (!cfg.STRIPE_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STRIPE_SECRET_KEY'],
        message: 'Obrigatório quando PAYMENT_PROVIDER=stripe',
      });
    }
    if (!cfg.STRIPE_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STRIPE_WEBHOOK_SECRET'],
        message: 'Obrigatório quando PAYMENT_PROVIDER=stripe (sem ele o webhook não é verificável)',
      });
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
