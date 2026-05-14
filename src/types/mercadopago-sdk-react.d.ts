declare module '@mercadopago/sdk-react' {
  import type { ComponentType } from 'react';

  export function initMercadoPago(
    publicKey: string,
    options?: { locale?: string },
  ): void;

  export const Wallet: ComponentType<{
    initialization: {
      preferenceId: string;
      redirectMode?: 'blank' | 'self' | 'modal';
    };
    customization?: {
      texts?: {
        valueProp?: string;
      };
    };
    onReady?: () => void;
    onError?: (error: unknown) => void;
  }>;
}
