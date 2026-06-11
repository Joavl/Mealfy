export interface VoucherProviderInfo {
  provider: string;
  partnerName: string;
  redeemInstructions: string;
  redeemDeepLink: string;
  walletPath: string;
}

export interface VoucherProvider {
  generateCode(): string;
  buildLabel(amount: number): string;
  getInfo(code?: string): VoucherProviderInfo;
}

export class MockVoucherProvider implements VoucherProvider {
  generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'MOCKVALE-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  buildLabel(amount: number): string {
    return `Vale-Alimentação R$ ${amount.toFixed(2)}`;
  }

  getInfo(code?: string): VoucherProviderInfo {
    return {
      provider: 'mock-provider',
      partnerName: 'Rede Alimentar Mock',
      redeemInstructions: `Use o código ${code || 'MEALFY-CODE'} na carteira digital parceira para resgatar seu crédito.`,
      redeemDeepLink: 'https://mealfy.org/redeem',
      walletPath: '/carteira/mock',
    };
  }
}
export const voucherProvider: VoucherProvider = new MockVoucherProvider();
