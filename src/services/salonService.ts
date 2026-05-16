import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { SalonConnectionState, SalonOrder, SalonOrderStatus } from '@/types/salon';
import type { LegacyPaymentMethod, PaymentStatus } from '@/types/payment';
import { mapOrderItemRow, type OrderItemRowLike } from '@/utils/mapOrderItem';

interface SalonOrderRow {
  id: string;
  order_number: string;
  table_number: string;
  total: number | string;
  total_amount?: number | string | null;
  payment_method: LegacyPaymentMethod | null;
  payment_status?: PaymentStatus | null;
  note: string | null;
  status: SalonOrderStatus;
  created_at: string;
  ready_at: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  order_items?: OrderItemRowLike[];
}

interface SalonOrderRealtimeRow {
  id?: string;
  status?: SalonOrderStatus;
}

export interface SalonSubscriptionHandlers {
  onChange: () => void;
  onReady?: (orderId: string) => void;
  onStatus?: (status: SalonConnectionState) => void;
}

function mapSalonOrder(row: SalonOrderRow): SalonOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    tableNumber: row.table_number,
    total: Number(row.total),
    totalAmount: Number(row.total_amount ?? row.total),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status ?? 'paid',
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    readyAt: row.ready_at,
    claimedBy: row.claimed_by,
    claimedAt: row.claimed_at,
    items: (row.order_items ?? []).map(mapOrderItemRow),
  };
}

export async function fetchReadyOrders(): Promise<SalonOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('status', 'ready')
    .order('ready_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as SalonOrderRow[] | null)?.map(mapSalonOrder) ?? [];
}

export async function claimTask(orderId: string, staffName: string | null): Promise<void> {
  const nextClaim = staffName?.trim() || null;
  const { error } = await supabase
    .from('orders')
    .update({
      claimed_by: nextClaim,
      claimed_at: nextClaim ? new Date().toISOString() : null,
    })
    .eq('id', orderId);

  if (error) throw new Error(error.message);
}

export async function completeTask(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'delivered',
      claimed_by: null,
      claimed_at: null,
    })
    .eq('id', orderId);

  if (error) throw new Error(error.message);
}

export function subscribeToSalonOrders({
  onChange,
  onReady,
  onStatus,
}: SalonSubscriptionHandlers): () => void {
  let channel: RealtimeChannel | null = supabase.channel('salon-orders');

  const handleRealtimeRow = (row: SalonOrderRealtimeRow) => {
    if (row.id && row.status === 'ready') {
      onReady?.(row.id);
    }
    onChange();
  };

  channel
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload) => handleRealtimeRow(payload.new as SalonOrderRealtimeRow),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders' },
      (payload) => handleRealtimeRow(payload.new as SalonOrderRealtimeRow),
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'orders' },
      () => onChange(),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onStatus?.('connected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
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
