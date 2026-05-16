import { useEffect, useState } from 'react';
import { Banknote, CreditCard, X } from 'lucide-react';
import type { Order, OrderStatus } from '@/types/order';
import { formatPrice } from '@/utils/formatPrice';
import { minutesSince, timeAgo } from '@/utils/timeAgo';
import { nextStatus } from '@/services/kitchenService';

interface KitchenOrderCardProps {
  order: Order;
  busy?: boolean;
  onAdvance: (order: Order) => void;
  onCancel: (order: Order) => void;
}

const STATE_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Esperando pago',
  new: 'Nuevo',
  preparing: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const ADVANCE_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: '',
  new: 'Empezar a preparar',
  preparing: 'Marcar listo',
  ready: 'Entregar',
  delivered: '',
  cancelled: '',
};

function stateAccent(status: OrderStatus, ageMinutes: number): string {
  if (status === 'ready') {
    return 'border-emerald-400/40 bg-emerald-400/[0.04]';
  }
  if (status === 'preparing') {
    return 'border-amber-300/30 bg-amber-300/[0.03]';
  }
  // new
  if (ageMinutes >= 8) {
    return 'border-red-400/50 bg-red-400/[0.06]';
  }
  if (ageMinutes >= 4) {
    return 'border-amber-300/40 bg-amber-300/[0.04]';
  }
  return 'border-white/15 bg-ink-800';
}

export function KitchenOrderCard({
  order,
  busy = false,
  onAdvance,
  onCancel,
}: KitchenOrderCardProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const ageMinutes = minutesSince(order.createdAt, now);
  const accent = stateAccent(order.status, ageMinutes);
  const advanceLabel = ADVANCE_LABELS[order.status];
  const advanceTarget = nextStatus(order.status);

  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl border p-5 transition ${accent}`}
      aria-label={`Pedido ${order.orderNumber}, mesa ${order.tableNumber}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
            Pedido
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
            #{order.orderNumber}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
            Mesa
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-white">
            {order.tableNumber}
          </p>
        </div>
      </header>

      <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em]">
        <span className="text-white/80">{STATE_LABELS[order.status]}</span>
        <span className="text-white/45 tabular-nums">{timeAgo(order.createdAt, now)}</span>
      </div>

      <ul className="space-y-3 border-t border-white/[0.08] pt-4">
        {order.items.map((it) => {
          const hasUniversal = it.universalExtras.length > 0;
          const hasSpecific = it.specificExtras.length > 0;
          const hasRemoved = it.removedIngredients.length > 0;
          return (
            <li key={it.id} className="text-base text-white">
              <div className="flex items-baseline gap-3">
                <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-white/10 px-2 text-sm font-semibold tabular-nums text-white">
                  {it.quantity}
                </span>
                <span className="text-balance">{it.productName}</span>
              </div>
              {(hasUniversal || hasSpecific) && (
                <ul className="ml-10 mt-1.5 space-y-0.5 text-sm text-emerald-200">
                  {it.universalExtras.map((extra) => (
                    <li key={`u-${extra.extra_id}`}>
                      + {extra.name}
                      {extra.qty > 1 ? ` x${extra.qty}` : ''}
                    </li>
                  ))}
                  {it.specificExtras.map((extra) => (
                    <li key={`s-${extra.extra_id}`}>+ {extra.name}</li>
                  ))}
                </ul>
              )}
              {hasRemoved && (
                <ul className="ml-10 mt-1.5 space-y-0.5 text-sm font-semibold uppercase tracking-wide text-red-300">
                  {it.removedIngredients.map((ing) => (
                    <li key={`r-${ing.ingredient_id}`}>SIN {ing.name}</li>
                  ))}
                </ul>
              )}
              {it.itemNote && (
                <p className="ml-10 mt-1.5 text-sm italic text-white/75">
                  “{it.itemNote}”
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {order.note && (
        <p className="rounded-xl border border-white/[0.08] bg-ink-900 px-3 py-2 text-sm leading-snug text-white/80">
          <span className="block text-[10px] uppercase tracking-[0.24em] text-white/45">
            Nota
          </span>
          {order.note}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-white/[0.08] pt-3 text-xs text-white/55">
        <span className="inline-flex items-center gap-1.5">
          {order.paymentMethod === 'cash' ? (
            <Banknote size={14} />
          ) : (
            <CreditCard size={14} />
          )}
          {order.paymentMethod === 'cash' ? 'Efectivo' : 'MP'}
        </span>
        <span className="tabular-nums">{formatPrice(order.totalAmount)}</span>
      </div>

      <div className="mt-1 flex items-stretch gap-2">
        {advanceTarget && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAdvance(order)}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-white px-3 text-center text-[13px] font-semibold uppercase tracking-[0.14em] leading-tight text-black transition hover:bg-white/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/30 sm:px-5 sm:text-sm sm:tracking-[0.18em]"
          >
            {busy ? 'Guardando…' : advanceLabel}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onCancel(order)}
          aria-label="Cancelar pedido"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 text-sm font-semibold uppercase tracking-[0.18em] text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4"
        >
          <X size={16} className="sm:hidden" />
          <span className="hidden sm:inline">Cancelar</span>
        </button>
      </div>
    </article>
  );
}
