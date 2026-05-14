import { supabase } from './supabaseClient';
import type { Order, OrderStatus } from '@/types/order';
import type { LegacyPaymentMethod, PaymentStatus } from '@/types/payment';

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
  preparing_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  order_items: ItemRow[];
}

interface ItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_type: 'burger' | 'drink' | 'side';
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
}

export interface BusinessOrder extends Order {
  preparingAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

function mapOrder(row: OrderRow): BusinessOrder {
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
    preparingAt: row.preparing_at,
    readyAt: row.ready_at,
    deliveredAt: row.delivered_at,
    cancelledAt: row.cancelled_at,
    items: row.order_items.map((it) => ({
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

export async function fetchOrdersInRange(
  startIso: string,
  endIso: string,
): Promise<BusinessOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as OrderRow[] | null)?.map(mapOrder) ?? [];
}

// ---------------------------------------------------------------------------
// Derived metrics (computed client-side from the order set).
// All revenue metrics require status = 'delivered'.
// ---------------------------------------------------------------------------

export interface KpiSummary {
  revenue: number;
  delivered: number;
  averageTicket: number;
  topBurger: { name: string; units: number } | null;
}

export function computeKpis(orders: BusinessOrder[]): KpiSummary {
  const delivered = orders.filter((o) => o.status === 'delivered');
  const revenue = delivered.reduce((sum, o) => sum + o.totalAmount, 0);
  const count = delivered.length;
  const averageTicket = count > 0 ? revenue / count : 0;

  const burgerUnits = new Map<string, number>();
  for (const o of delivered) {
    for (const it of o.items) {
      if (it.productType !== 'burger') continue;
      burgerUnits.set(it.productName, (burgerUnits.get(it.productName) ?? 0) + it.quantity);
    }
  }
  let topBurger: { name: string; units: number } | null = null;
  for (const [name, units] of burgerUnits) {
    if (!topBurger || units > topBurger.units) topBurger = { name, units };
  }

  return { revenue, delivered: count, averageTicket, topBurger };
}

export interface RevenueByDay {
  date: string;
  label: string;
  revenue: number;
}

export function computeRevenueByDay(
  orders: BusinessOrder[],
  buckets: { date: string; label: string }[],
): RevenueByDay[] {
  const totals = new Map<string, number>();
  for (const o of orders) {
    if (o.status !== 'delivered') continue;
    const key = o.createdAt.slice(0, 10);
    totals.set(key, (totals.get(key) ?? 0) + o.totalAmount);
  }
  return buckets.map((b) => ({
    date: b.date,
    label: b.label,
    revenue: totals.get(b.date) ?? 0,
  }));
}

export interface BurgerRanking {
  name: string;
  units: number;
}

export function computeBurgerRanking(orders: BusinessOrder[]): BurgerRanking[] {
  const totals = new Map<string, number>();
  for (const o of orders) {
    if (o.status !== 'delivered') continue;
    for (const it of o.items) {
      if (it.productType !== 'burger') continue;
      totals.set(it.productName, (totals.get(it.productName) ?? 0) + it.quantity);
    }
  }
  return Array.from(totals.entries())
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units);
}

export interface PaymentSplit {
  method: LegacyPaymentMethod;
  label: string;
  amount: number;
  count: number;
}

export function computePaymentSplit(orders: BusinessOrder[]): PaymentSplit[] {
  const buckets: Record<LegacyPaymentMethod, PaymentSplit> = {
    cash: { method: 'cash', label: 'Efectivo', amount: 0, count: 0 },
    mercadopago: { method: 'mercadopago', label: 'MercadoPago', amount: 0, count: 0 },
    transfer: { method: 'transfer', label: 'Transferencia legacy', amount: 0, count: 0 },
  };
  for (const o of orders) {
    if (o.status !== 'delivered') continue;
    if (!o.paymentMethod) continue;
    buckets[o.paymentMethod].amount += o.totalAmount;
    buckets[o.paymentMethod].count += 1;
  }
  return Object.values(buckets);
}

// 7 (days of week) x 24 (hours) matrix.
export interface HeatmapCell {
  day: number; // 0 = Mon ... 6 = Sun
  hour: number; // 0..23
  count: number;
}

export function computeHeatmap(orders: BusinessOrder[]): HeatmapCell[] {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const o of orders) {
    const d = new Date(o.createdAt);
    // Date#getDay returns 0 (Sun) - 6 (Sat). Shift so Mon=0...Sun=6 for a more
    // intuitive heatmap (lunch + dinner cluster on the same axis).
    const dayMonFirst = (d.getDay() + 6) % 7;
    grid[dayMonFirst][d.getHours()] += 1;
  }
  const out: HeatmapCell[] = [];
  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      out.push({ day, hour, count: grid[day][hour] });
    }
  }
  return out;
}

export interface OperationalTimings {
  avgPrepMinutes: number | null;
  avgTotalMinutes: number | null;
  sampleSize: number;
}

export function computeOperationalTimings(orders: BusinessOrder[]): OperationalTimings {
  const prepMinutes: number[] = [];
  const totalMinutes: number[] = [];
  for (const o of orders) {
    if (o.status !== 'delivered') continue;
    if (o.preparingAt && o.readyAt) {
      const diff =
        (new Date(o.readyAt).getTime() - new Date(o.preparingAt).getTime()) / 60000;
      if (diff >= 0) prepMinutes.push(diff);
    }
    if (o.deliveredAt) {
      const diff =
        (new Date(o.deliveredAt).getTime() - new Date(o.createdAt).getTime()) / 60000;
      if (diff >= 0) totalMinutes.push(diff);
    }
  }
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  return {
    avgPrepMinutes: avg(prepMinutes),
    avgTotalMinutes: avg(totalMinutes),
    sampleSize: orders.filter((o) => o.status === 'delivered').length,
  };
}

export function filterOrders(
  orders: BusinessOrder[],
  filters: {
    status?: OrderStatus | 'all';
    paymentMethod?: LegacyPaymentMethod | 'all';
    table?: string;
    search?: string;
  },
): BusinessOrder[] {
  const status = filters.status ?? 'all';
  const pm = filters.paymentMethod ?? 'all';
  const table = filters.table?.trim() ?? '';
  const search = filters.search?.trim().toLowerCase() ?? '';
  return orders.filter((o) => {
    if (status !== 'all' && o.status !== status) return false;
    if (pm !== 'all' && o.paymentMethod !== pm) return false;
    if (table && o.tableNumber !== table) return false;
    if (search && !o.orderNumber.toLowerCase().includes(search)) return false;
    return true;
  });
}

export interface RevenueDiff {
  current: number;
  previous: number;
  /** Null when previous is zero — avoids divide-by-zero. */
  pctChange: number | null;
}

export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function diff(current: number, previous: number): RevenueDiff {
  return {
    current,
    previous,
    pctChange: pctDelta(current, previous),
  };
}

export function realtimeOrdersChannel(
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel('business-orders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
