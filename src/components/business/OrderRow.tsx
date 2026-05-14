import type { BusinessOrder } from '@/services/businessService';
import type { OrderStatus } from '@/types/order';
import type { LegacyPaymentMethod } from '@/types/payment';
import { formatPrice } from '@/utils/formatPrice';

const STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  awaiting_payment: { label: 'Esperando pago', tone: 'bg-amber-300/15 text-amber-200' },
  new: { label: 'Nuevo', tone: 'bg-white/10 text-white' },
  preparing: { label: 'Preparando', tone: 'bg-amber-300/15 text-amber-200' },
  ready: { label: 'Listo', tone: 'bg-emerald-400/15 text-emerald-300' },
  delivered: { label: 'Entregado', tone: 'bg-emerald-300/20 text-emerald-200' },
  cancelled: { label: 'Cancelado', tone: 'bg-red-400/15 text-red-300' },
};

const PAYMENT_LABEL: Record<LegacyPaymentMethod, string> = {
  cash: 'Efectivo',
  mercadopago: 'MercadoPago',
  transfer: 'Transferencia legacy',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${date} · ${time}`;
}

function prepMinutes(o: BusinessOrder): string {
  if (!o.preparingAt || !o.readyAt) return '—';
  const diff =
    (new Date(o.readyAt).getTime() - new Date(o.preparingAt).getTime()) / 60000;
  return `${diff.toFixed(1)} min`;
}

function itemsSummary(o: BusinessOrder): string {
  return o.items.map((it) => `${it.quantity}× ${it.productName}`).join(', ');
}

interface OrderRowProps {
  order: BusinessOrder;
}

export function OrderRow({ order }: OrderRowProps) {
  const s = STATUS[order.status];
  return (
    <tr className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
      <td className="py-3 pr-3 align-top">
        <span className="font-mono text-xs text-white/80">#{order.orderNumber}</span>
      </td>
      <td className="py-3 pr-3 align-top text-white tabular-nums">
        {order.tableNumber}
      </td>
      <td className="py-3 pr-3 align-top text-sm text-white/80">
        {itemsSummary(order)}
      </td>
      <td className="py-3 pr-3 align-top text-white tabular-nums">
        {formatPrice(order.totalAmount)}
      </td>
      <td className="py-3 pr-3 align-top">
        <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/70">
          {order.paymentMethod ? PAYMENT_LABEL[order.paymentMethod] : 'Legacy'}
        </span>
      </td>
      <td className="py-3 pr-3 align-top">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${s.tone}`}
        >
          {s.label}
        </span>
      </td>
      <td className="py-3 pr-3 align-top text-xs text-white/55 tabular-nums">
        {fmtDate(order.createdAt)}
      </td>
      <td className="py-3 pr-3 align-top text-xs text-white/55 tabular-nums">
        {order.status === 'delivered' ? prepMinutes(order) : '—'}
      </td>
    </tr>
  );
}
