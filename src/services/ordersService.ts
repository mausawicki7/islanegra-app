import { supabase } from './supabaseClient';
import type { Order, OrderInput } from '@/types/order';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { OrderStatus } from '@/types/order';

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
  order_items?: OrderItemRow[];
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

function generateOrderNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${yy}${mm}${dd}-${rand}`;
}

function computeSubtotal(items: OrderInput['items']): number {
  return items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
}

export async function createOrder(input: OrderInput): Promise<Order> {
  const subtotal = computeSubtotal(input.items);
  const total = subtotal;
  const orderNumber = generateOrderNumber();

  const { data: orderRow, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      table_number: input.tableNumber,
      subtotal,
      total,
      payment_method: input.paymentMethod,
      note: input.note,
      status: 'new',
    })
    .select()
    .single();

  if (orderErr || !orderRow) {
    throw new Error(orderErr?.message ?? 'No se pudo crear el pedido');
  }

  const itemRows = input.items.map((it) => ({
    order_id: orderRow.id,
    product_id: it.productId,
    product_name: it.productName,
    product_type: it.productType,
    quantity: it.quantity,
    unit_price: it.unitPrice,
    subtotal: it.unitPrice * it.quantity,
  }));

  const { data: insertedItems, error: itemsErr } = await supabase
    .from('order_items')
    .insert(itemRows)
    .select();

  if (itemsErr) {
    throw new Error(itemsErr.message);
  }

  return mapOrder({ ...orderRow, order_items: insertedItems ?? [] } as OrderRow);
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapOrder(data as OrderRow) : null;
}

export function subscribeToOrder(
  orderId: string,
  onChange: () => void,
  onStatus?: (status: 'connected' | 'reconnecting') => void,
): () => void {
  let channel: RealtimeChannel | null = supabase.channel(`order-${orderId}`);
  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      },
      () => onChange(),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onStatus?.('connected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onStatus?.('reconnecting');
      }
    });

  return () => {
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  };
}
