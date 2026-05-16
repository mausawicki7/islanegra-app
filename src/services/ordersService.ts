import { supabase } from './supabaseClient';
import type { Order } from '@/types/order';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { OrderStatus } from '@/types/order';
import type { LegacyPaymentMethod, PaymentMethod, PaymentStatus } from '@/types/payment';
import { mapOrderItemRow, type OrderItemRowLike } from '@/utils/mapOrderItem';

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
  order_items?: OrderItemRowLike[];
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
    items: (row.order_items ?? []).map(mapOrderItemRow),
  };
}

interface ServerSideOrderInput {
  tableNumber: string;
  paymentMethod: PaymentMethod;
  note: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    universalExtras?: Array<{ extraId: string; qty: number }>;
    specificExtras?: string[];
    removedIngredients?: string[];
    note?: string | null;
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
