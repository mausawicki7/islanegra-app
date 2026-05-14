import { supabase } from './supabaseClient';
import type { Order, OrderStatus } from '@/types/order';
import type { LegacyPaymentMethod, PaymentStatus } from '@/types/payment';

const ACTIVE_STATUSES: OrderStatus[] = ['new', 'preparing', 'ready'];

interface OrderRow {
  id: string;
  order_number: string;
  table_number: string;
  subtotal: number | string;
  total: number | string;
  subtotal_amount?: number | string | null;
  discount_amount?: number | string | null;
  total_amount?: number | string | null;
  payment_method: LegacyPaymentMethod | null;
  payment_status?: PaymentStatus | null;
  payment_gateway_id?: string | null;
  payment_confirmed_at?: string | null;
  note: string | null;
  status: OrderStatus;
  created_at: string;
  order_items: OrderItemRow[];
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_type: 'burger' | 'drink' | 'side';
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    tableNumber: row.table_number,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    subtotalAmount: Number(row.subtotal_amount ?? row.subtotal),
    discountAmount: Number(row.discount_amount ?? 0),
    totalAmount: Number(row.total_amount ?? row.total),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status ?? 'paid',
    paymentGatewayId: row.payment_gateway_id ?? null,
    paymentConfirmedAt: row.payment_confirmed_at ?? null,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    items: (row.order_items ?? []).map((it) => ({
      id: it.id,
      orderId: it.order_id,
      productId: it.product_id,
      productName: it.product_name,
      productType: it.product_type,
      quantity: it.quantity,
      unitPrice: Number(it.unit_price),
      subtotal: Number(it.subtotal),
    })),
  };
}

export async function fetchActiveOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .in('status', ACTIVE_STATUSES)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as OrderRow[] | null)?.map(mapOrder) ?? [];
}

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  awaiting_payment: null,
  new: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
  delivered: null,
  cancelled: null,
};

export function nextStatus(current: OrderStatus): OrderStatus | null {
  return STATUS_FLOW[current];
}

export async function advanceOrderStatus(orderId: string, current: OrderStatus): Promise<void> {
  const next = nextStatus(current);
  if (!next) return;
  const { error } = await supabase
    .from('orders')
    .update({ status: next })
    .eq('id', orderId);
  if (error) throw new Error(error.message);
}

export async function cancelOrder(orderId: string, reason?: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', cancellation_reason: reason ?? null })
    .eq('id', orderId);
  if (error) throw new Error(error.message);
}

export async function fetchPendingCashPayments(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('status', 'awaiting_payment')
    .eq('payment_method', 'cash')
    .eq('payment_status', 'unpaid')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as OrderRow[] | null)?.map(mapOrder) ?? [];
}

export interface OrdersSubscriptionHandlers {
  onInsert?: (orderId: string) => void;
  onChange?: () => void;
}

export function subscribeToOrders({ onInsert, onChange }: OrdersSubscriptionHandlers) {
  const maybeNotifyActivePaid = (row: Partial<OrderRow> & { id?: string }) => {
    if (
      row.id &&
      row.payment_status === 'paid' &&
      row.status &&
      ACTIVE_STATUSES.includes(row.status)
    ) {
      onInsert?.(row.id);
    }
  };

  const channel = supabase
    .channel('kitchen-orders')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload) => {
        maybeNotifyActivePaid(payload.new as Partial<OrderRow> & { id: string });
        onChange?.();
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders' },
      (payload) => {
        maybeNotifyActivePaid(payload.new as Partial<OrderRow> & { id: string });
        onChange?.();
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'orders' },
      () => onChange?.(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToPendingCashPayments({
  onInsert,
  onChange,
}: OrdersSubscriptionHandlers) {
  const channel = supabase
    .channel('kitchen-cash-payments')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: 'payment_method=eq.cash',
      },
      (payload) => {
        const row = payload.new as { id: string; payment_status?: string };
        if (row.payment_status === 'unpaid') {
          onInsert?.(row.id);
        }
        onChange?.();
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders' },
      () => onChange?.(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
