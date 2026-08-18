import { z } from 'zod';

export const createDonationSchema = z.object({
  familyId: z.string().min(1),
  amount: z.number().int().positive(), // centavos
  /** Provedor do vale-refeição (não confundir com o meio de pagamento). */
  provider: z.enum(['ifood', 'ninetynine', 'carrefour']).optional(),
  /**
   * Meio de pagamento. `card` cobre Google Pay/Apple Pay — a carteira entrega um
   * cartão tokenizado ao gateway. Default `pix` mantém o contrato anterior.
   */
  paymentMethod: z.enum(['pix', 'card']).default('pix'),
});

export type CreateDonationInput = z.infer<typeof createDonationSchema>;
