import type { ProductType } from './burger';

export type PaymentMethod = 'cash' | 'mercadopago';
export type LegacyPaymentMethod = PaymentMethod | 'transfer';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export interface PaymentTotals {
  subtotal: number;
  discount: number;
  total: number;
}

export interface PaymentPreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  productType?: ProductType;
}

export interface PaymentStatusSnapshot {
  orderId: string;
  paymentStatus: PaymentStatus;
  orderStatus: string;
  paymentMethod: LegacyPaymentMethod | null;
  paymentGatewayId: string | null;
}

export interface PaymentPreferenceResponse {
  preferenceId: string;
  initPoint: string | null;
}
