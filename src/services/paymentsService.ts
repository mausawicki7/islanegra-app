import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { fetchOrderById } from './ordersService';
import type { Order } from '@/types/order';
import type {
  PaymentPreferenceResponse,
  PaymentStatus,
  PaymentStatusSnapshot,
} from '@/types/payment';

interface PaymentStatusRow {
  id: string;
  status: string;
  payment_status: PaymentStatus;
  payment_method: PaymentStatusSnapshot['paymentMethod'];
  payment_gateway_id: string | null;
}

export async function createPaymentPreference(input: {
  orderId: string;
}): Promise<PaymentPreferenceResponse> {
  const { data, error } = await supabase.functions.invoke<PaymentPreferenceResponse>(
    'create-payment-preference',
    {
      body: {
        orderId: input.orderId,
      },
    },
  );

  if (error) throw new Error(error.message);
  if (!data?.preferenceId) {
    throw new Error('MercadoPago no devolvió preferenceId');
  }
  return {
    preferenceId: data.preferenceId,
    initPoint: data.initPoint ?? null,
  };
}

export async function fetchPaymentStatus(
  orderId: string,
): Promise<PaymentStatusSnapshot | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, payment_status, payment_method, payment_gateway_id')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as PaymentStatusRow;
  return {
    orderId: row.id,
    orderStatus: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    paymentGatewayId: row.payment_gateway_id,
  };
}

export async function confirmCashPayment(
  orderOrId: Order | string,
  collectedBy?: string,
): Promise<void> {
  const order = typeof orderOrId === 'string' ? await fetchOrderById(orderOrId) : orderOrId;

  if (!order) {
    throw new Error('No se encontró el pedido');
  }

  const idempotencyKey = `cash_${order.id}`;
  const { error: paymentError } = await supabase.from('payments').insert({
    order_id: order.id,
    amount: order.totalAmount,
    method: 'cash',
    status: 'approved',
    collected_by: collectedBy?.trim() || null,
    idempotency_key: idempotencyKey,
  });

  if (
    paymentError &&
    (paymentError as { code?: string }).code !== '23505' &&
    !paymentError.message.includes('duplicate key')
  ) {
    throw new Error(paymentError.message);
  }

  const { error: orderError } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'new',
      payment_confirmed_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  if (orderError) throw new Error(orderError.message);
}

export async function cancelUnpaidOrder(
  orderId: string,
  reason: 'customer' | 'payment_timeout' = 'customer',
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      payment_status: 'failed',
      cancellation_reason: reason,
    })
    .eq('id', orderId)
    .neq('payment_status', 'paid');

  if (error) throw new Error(error.message);
}

export function subscribeToPaymentStatus(
  orderId: string,
  onChange: (snapshot: PaymentStatusSnapshot) => void,
): () => void {
  let channel: RealtimeChannel | null = supabase.channel(`payment-status-${orderId}`);

  channel
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        const row = payload.new as PaymentStatusRow;
        onChange({
          orderId: row.id,
          orderStatus: row.status,
          paymentStatus: row.payment_status,
          paymentMethod: row.payment_method,
          paymentGatewayId: row.payment_gateway_id,
        });
      },
    )
    .subscribe();

  return () => {
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  };
}
