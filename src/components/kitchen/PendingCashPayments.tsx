import { useCallback, useEffect, useRef, useState } from 'react';
import { Banknote } from 'lucide-react';
import type { Order } from '@/types/order';
import {
  fetchPendingCashPayments,
  subscribeToPendingCashPayments,
} from '@/services/kitchenService';
import { confirmCashPayment } from '@/services/paymentsService';
import { formatPrice } from '@/utils/formatPrice';
import { playNewOrderChime } from '@/utils/sound';
import { timeAgo } from '@/utils/timeAgo';

interface PendingCashPaymentsProps {
  onConfirmed: () => void;
  onError: (message: string | null) => void;
}

export function PendingCashPayments({
  onConfirmed,
  onError,
}: PendingCashPaymentsProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const seenIdsRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const next = await fetchPendingCashPayments();
      setOrders(next);
      seenIdsRef.current = new Set(next.map((order) => order.id));
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al cargar cobranzas');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeToPendingCashPayments({
      onInsert: (id) => {
        if (!seenIdsRef.current.has(id)) {
          playNewOrderChime();
        }
      },
      onChange: () => {
        void refresh();
      },
    });
    return unsubscribe;
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const markPaid = async (order: Order) => {
    const confirmed = window.confirm(
      `¿Cobraste ${formatPrice(order.totalAmount)} en efectivo a la mesa ${order.tableNumber}?`,
    );
    if (!confirmed) return;

    setBusyId(order.id);
    onError(null);
    try {
      await confirmCashPayment(order);
      await refresh();
      onConfirmed();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al confirmar efectivo');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <section className="mb-6 rounded-2xl border border-white/[0.08] bg-ink-900 p-4">
        <p className="text-sm text-white/45">Cargando cobranzas...</p>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-white/[0.08] bg-ink-900 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
            Cobranzas pendientes
          </p>
          <h2 className="mt-2 text-xl font-semibold uppercase tracking-tightest text-white">
            Efectivo antes de cocina
          </h2>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5">
          <Banknote size={20} className="text-white" strokeWidth={1.5} />
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-white/45">No hay mesas esperando cobro.</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-xl border border-white/[0.08] bg-[#151515] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                    Pedido #{order.orderNumber}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white tabular-nums">
                    Mesa {order.tableNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                    Cobrar
                  </p>
                  <p className="mt-2 text-xl text-white tabular-nums">
                    {formatPrice(order.totalAmount)}
                  </p>
                  {order.discountAmount > 0 && (
                    <p className="mt-1 text-xs text-white/40 tabular-nums">
                      off {formatPrice(order.discountAmount)}
                    </p>
                  )}
                </div>
              </div>

              <ul className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-3 text-sm text-white/75">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>{item.productName}</span>
                    <span className="tabular-nums">x{item.quantity}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-white/40">
                  {timeAgo(order.createdAt, now)}
                </span>
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => void markPaid(order)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-xs font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30"
                >
                  {busyId === order.id ? 'Marcando...' : 'Cobrado'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
