import { supabase } from './supabaseClient';
import type { Order, OrderInput } from '@/types/order';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { OrderStatus } from '@/types/order';
import type { LegacyPaymentMethod, PaymentMethod, PaymentStatus } from '@/types/payment';
import { calculatePaymentTotals } from '@/utils/calculatePaymentTotals';

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
  const totals = input.totals ?? calculatePaymentTotals(subtotal, input.paymentMethod);
  const orderNumber = generateOrderNumber();
  const paymentStatus =
    input.paymentStatus ?? (input.paymentMethod === 'cash' ? 'unpaid' : 'pending');

  const { data: orderRow, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      table_number: input.tableNumber,
      subtotal,
      total: totals.subtotal,
      payment_method: input.paymentMethod,
      payment_status: paymentStatus,
      subtotal_amount: totals.subtotal,
      discount_amount: totals.discount,
      total_amount: totals.total,
      note: input.note,
      status: 'awaiting_payment',
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

interface ServerSideOrderInput {
  tableNumber: string;
  paymentMethod: PaymentMethod;
  note: string | null;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export async function createOrderServerSide(input: ServerSideOrderInput): Promise<Order> {
  const { data, error } = await supabase.functions.invoke<OrderRow>('create-order', {
    body: input,
  });

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error('No se pudo crear el pedido');
  }

  return mapOrder(data);
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
