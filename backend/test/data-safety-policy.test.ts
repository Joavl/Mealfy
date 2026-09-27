import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.APP_ENV = 'ci';
process.env.NODE_ENV = 'test';
process.env.DIRECT_PIX_MODE = 'synthetic';
process.env.DIRECT_PIX_SYNTHETIC_EVPS = '00000000-0000-0000-0000-000000000001';
process.env.EMAIL_DELIVERY_MODE = 'capture';
process.env.EMAIL_CAPTURE_DIR = '.tmp/test-mail';

// Runtime modules load after the explicit safety classification above.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { dataSafetyPolicy } = require('../src/config/dataSafetyPolicy') as typeof import('../src/config/dataSafetyPolicy');

test('non-production refuses arbitrary family data before parsing it', () => {
  assert.throws(
    () => dataSafetyPolicy.assertFamilyDataCollectionAllowed(),
    (error: unknown) => {
      const refusal = error as { statusCode: number; code: string; message: string };
      assert.equal(refusal.statusCode, 423);
      assert.equal(refusal.code, 'real_family_data_forbidden');
      assert.doesNotMatch(refusal.message, /família sentinela|00000000/);
      return true;
    },
  );
});

test('non-production accepts only configured synthetic EVP values', () => {
  assert.doesNotThrow(() => dataSafetyPolicy.assertEvpAllowed('00000000-0000-0000-0000-000000000001'));
  assert.throws(
    () => dataSafetyPolicy.assertEvpAllowed('11111111-1111-1111-1111-111111111111'),
    (error: unknown) => (error as { code: string }).code === 'synthetic_evp_required',
  );
});

test('non-production presentation is explicitly non-payable and is not a BR Code', () => {
  const presentation = dataSafetyPolicy.createSyntheticPresentation('fixture-1');
  assert.deepEqual(presentation, {
    payable: false,
    format: 'mealfy-test-v1',
    payload: 'MEALFY-NONPAYABLE:fixture-1',
  });
  assert.doesNotMatch(presentation.payload, /^000201/);
  assert.doesNotMatch(presentation.payload, /6304[0-9A-F]{4}$/);
});
