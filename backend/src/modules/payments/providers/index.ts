import { env } from '../../../config/env';
import { MockPixProvider } from './mockPixProvider';
import { StripeProvider } from './stripeProvider';
import type { PaymentProvider } from './paymentProvider';

export * from './paymentProvider';

/**
 * Fábrica do provider conforme PAYMENT_PROVIDER.
 *  - `mock`   → Pix fictício (dev/staging), sem dinheiro real.
 *  - `stripe` → Pix e cartão reais (cartão = caminho do Google Pay/Apple Pay).
 */
export function buildPaymentProvider(): PaymentProvider {
  switch (env.PAYMENT_PROVIDER) {
    case 'stripe':
      return new StripeProvider();
    case 'mock':
    default:
      return new MockPixProvider();
  }
}

/** Instância única usada pela aplicação. */
export const paymentProvider: PaymentProvider = buildPaymentProvider();
