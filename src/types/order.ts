import type { ProductType } from './burger';

export type PaymentMethod = 'cash' | 'transfer';

export type OrderStatus =
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
  note: string | null;
  items: OrderItemInput[];
}

export interface Order {
  id: string;
  orderNumber: string;
  tableNumber: string;
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  note: string | null;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
}
