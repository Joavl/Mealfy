import { env } from './env';
import { AppError } from '../shared/errors/AppError';

const syntheticEvps = new Set(env.DIRECT_PIX_SYNTHETIC_EVPS ?? []);

export const dataSafetyPolicy = Object.freeze({
  environment: env.APP_ENV,
  acceptsRealFamilyData: env.APP_ENV === 'production',
  directPixRealDataEnabled: env.APP_ENV === 'production' && env.DIRECT_PIX_MODE === 'live',

  assertFamilyDataCollectionAllowed(): void {
    if (env.APP_ENV !== 'production') {
      throw new AppError('Cadastro de dados familiares indisponível neste ambiente.', 423, 'real_family_data_forbidden');
    }
  },

  assertEvpAllowed(evp: string): void {
    if (env.DIRECT_PIX_MODE === 'disabled') {
      throw new AppError('Pix direto indisponível.', 423, 'direct_pix_disabled');
    }
    if (env.APP_ENV !== 'production' && !syntheticEvps.has(evp)) {
      throw new AppError('Use uma chave sintética autorizada neste ambiente.', 422, 'synthetic_evp_required');
    }
  },

  createSyntheticPresentation(reference: string): { payable: false; format: 'mealfy-test-v1'; payload: string } {
    if (env.APP_ENV === 'production' || env.DIRECT_PIX_MODE !== 'synthetic') {
      throw new AppError('Apresentação sintética indisponível.', 409, 'synthetic_payload_forbidden');
    }
    return { payable: false, format: 'mealfy-test-v1', payload: 'MEALFY-NONPAYABLE:' + reference };
  },
});
