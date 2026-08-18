import { z } from 'zod';

/**
 * Login social baseado em token (o app nativo obtém o token via SDK do provedor
 * e o envia ao backend para verificação).
 *  - google/apple: `token` é o ID token (JWT).
 *  - facebook:     `token` é o access token.
 *  - `name` é opcional e só útil no PRIMEIRO login Apple (Apple não reenvia o nome).
 */
export const oauthTokenSchema = z.object({
  token: z.string().min(10, 'Token social ausente'),
  name: z.string().min(2).optional(),
});

export const oauthProviderParam = z.enum(['google', 'facebook', 'apple']);

export const govbrCallbackSchema = z.object({
  code: z.string().min(1, 'Código de autorização ausente'),
  state: z.string().optional(),
});

export type OAuthTokenInput = z.infer<typeof oauthTokenSchema>;
