import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import type { Order } from '@/types/order';
import {
  fetchPendingCashPayments,
  subscribeToPendingCashPayments,
} from '@/services/kitchenService';
import { confirmCashPayment } from '@/services/paymentsService';
import { claimTask } from '@/services/salonService';
import { formatPrice } from '@/utils/formatPrice';
import { timeAgo } from '@/utils/timeAgo';

interface PendingPaymentsSectionProps {
  staffName: string;
  onCountChange: (n: number) => void;
}

type LocalClaimMap = Record<string, string | null>;
type PendingPaymentOrder = Order & {
  claimedBy?: string | null;
  claimed_by?: string | null;
};

export function PendingPaymentsSection({
  staffName,
  onCountChange,
}: PendingPaymentsSectionProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [localClaims, setLocalClaims] = useState<LocalClaimMap>({});
  const seenIdsRef = useRef<Set<string>>(new Set());

  const normalizedStaffName = staffName.trim();

  const refresh = useCallback(async () => {
    try {
      const next = await fetchPendingCashPayments();
      setOrders(next);
      setLocalClaims((current) => {
        const activeIds = new Set(next.map((order) => order.id));
        return Object.fromEntries(
          Object.entries(current).filter(([id]) => activeIds.has(id)),
        );
      });
      seenIdsRef.current = new Set(next.map((order) => order.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar cobros');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeToPendingCashPayments({
      onInsert: (id) => {
        if (!seenIdsRef.current.has(id)) {
          navigator.vibrate?.([80, 40, 80]);
        }
      },
      onChange: () => {
        void refresh();
      },
    });
    return unsubscribe;
  }, [refresh]);

  useEffect(() => {
    onCountChange(orders.length);
  }, [onCountChange, orders.length]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const orderedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [orders],
  );

  const handleClaim = async (order: Order, nextClaim: string | null) => {
    setBusyId(order.id);
    setError(null);
    try {
      await claimTask(order.id, nextClaim);
      setLocalClaims((current) => ({ ...current, [order.id]: nextClaim }));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al tomar cobro');
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirm = async (order: Order) => {
    const confirmed = window.confirm(
      `¿Cobraste ${formatPrice(order.totalAmount)} en efectivo a la mesa ${order.tableNumber}?`,
    );
    if (!confirmed) return;

    setBusyId(order.id);
    setError(null);
    try {
      await confirmCashPayment(order, normalizedStaffName);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar efectivo');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#111111] p-4">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
          Cobros
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-white">
          Efectivo pendiente
        </h2>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-white/45">Cargando cobros...</p>
      ) : orderedOrders.length === 0 ? (
        <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#050505] px-4 py-10 text-center">
          <p className="text-sm uppercase tracking-[0.22em] text-white/45">
            Nada pendiente por ahora
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {orderedOrders.map((order) => {
            const paymentOrder = order as PendingPaymentOrder;
            const claimedBy =
              paymentOrder.claimedBy ??
              paymentOrder.claimed_by ??
              localClaims[order.id] ??
              null;
            const isOwnClaim = claimedBy === normalizedStaffName;
            const isClaimedByOther = Boolean(claimedBy && !isOwnClaim);
            const isBusy = busyId === order.id;

            return (
              <article
                key={order.id}
                className="rounded-xl border border-white/[0.08] bg-[#050505] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                      Mesa
                    </p>
                    <p className="mt-1 text-4xl font-semibold leading-none tracking-tight text-white tabular-nums">
                      {order.tableNumber}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/35">
                      Pedido #{order.orderNumber}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                      Cobrar
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                      {formatPrice(order.totalAmount)}
                    </p>
                    {order.discountAmount > 0 && (
                      <p className="mt-1 text-xs text-white/40 tabular-nums">
                        descuento {formatPrice(order.discountAmount)}
                      </p>
                    )}
                  </div>
                </div>

                <ul className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-3 text-sm text-white/75">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{item.productName}</span>
                      <span className="shrink-0 tabular-nums">x{item.quantity}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
                  <span>{timeAgo(order.createdAt, now)}</span>
                  {isClaimedByOther && (
                    <span className="text-white/65">Lo tomó {claimedBy}</span>
                  )}
                  {isOwnClaim && <span className="text-white/65">Lo tomaste vos</span>}
                </div>

                <div className="mt-4 flex gap-2">
                  {!claimedBy && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleClaim(order, normalizedStaffName || null)}
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-white/15 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/10 disabled:opacity-50"
                    >
                      Voy yo
                    </button>
                  )}

                  {(isOwnClaim || isClaimedByOther) && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleConfirm(order)}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 text-xs font-semibold uppercase tracking-[0.16em] text-black transition disabled:opacity-50"
                    >
                      <Check size={15} /> Cobrado
                    </button>
                  )}

                  {isOwnClaim && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleClaim(order, null)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10 disabled:opacity-50"
                      aria-label="Soltar cobro"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
