import type { ProductType } from './burger';
import type {
  LegacyPaymentMethod,
  PaymentMethod,
  PaymentStatus,
  PaymentTotals,
} from './payment';

export type { PaymentMethod };

export type OrderStatus =
  | 'awaiting_payment'
  | 'new'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface OrderItemInput {
  productId: string;
  productName: string;
  productType: ProductType;
  quantity: number;
  unitPrice: number;
}

export interface OrderItem extends OrderItemInput {
  id: string;
  orderId: string;
  subtotal: number;
}

export interface OrderInput {
  tableNumber: string;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  note: string | null;
  items: OrderItemInput[];
  totals?: PaymentTotals;
}

export interface Order {
  id: string;
  orderNumber: string;
  tableNumber: string;
  subtotal: number;
  total: number;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: LegacyPaymentMethod | null;
  paymentStatus: PaymentStatus;
  paymentGatewayId: string | null;
  paymentConfirmedAt: string | null;
  note: string | null;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
}
