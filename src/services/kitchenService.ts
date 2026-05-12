import { supabase } from './supabaseClient';
import type { Order, OrderStatus } from '@/types/order';

const ACTIVE_STATUSES: OrderStatus[] = ['new', 'preparing', 'ready'];

interface OrderRow {
  id: string;
  order_number: string;
  table_number: string;
  subtotal: number | string;
  total: number | string;
  payment_method: 'cash' | 'transfer';
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
    paymentMethod: row.payment_method,
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
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as OrderRow[] | null)?.map(mapOrder) ?? [];
}

const STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
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
    .update({ status: 'cancelled', cancel_reason: reason ?? null })
    .eq('id', orderId);
  if (error) throw new Error(error.message);
}

export interface OrdersSubscriptionHandlers {
  onInsert?: (orderId: string) => void;
  onChange?: () => void;
}

export function subscribeToOrders({ onInsert, onChange }: OrdersSubscriptionHandlers) {
  const channel = supabase
    .channel('kitchen-orders')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload) => {
        onInsert?.((payload.new as { id: string }).id);
        onChange?.();
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders' },
      () => onChange?.(),
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
