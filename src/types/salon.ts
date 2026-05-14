import type { OrderItem } from './order';
import type { LegacyPaymentMethod, PaymentStatus } from './payment';

export type SalonOrderStatus =
  | 'awaiting_payment'
  | 'pending'
  | 'in_kitchen'
  | 'new'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface ClaimableTask {
  id: string;
  claimedBy: string | null;
  claimedAt: string | null;
}

export interface SalonOrder extends ClaimableTask {
  orderNumber: string;
  tableNumber: string;
  total: number;
  totalAmount: number;
  paymentMethod: LegacyPaymentMethod | null;
  paymentStatus: PaymentStatus;
  note: string | null;
  status: SalonOrderStatus;
  createdAt: string;
  readyAt: string | null;
  items: OrderItem[];
}

export interface StaffIdentity {
  name: string;
}

export type SalonConnectionState = 'connected' | 'reconnecting';
