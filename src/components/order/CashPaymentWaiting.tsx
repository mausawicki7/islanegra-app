import { useEffect, useState } from 'react';
import { Banknote } from 'lucide-react';
import type { Order } from '@/types/order';
import { formatPrice } from '@/utils/formatPrice';
import { cancelUnpaidOrder } from '@/services/paymentsService';

interface CashPaymentWaitingProps {
  order: Order;
  secondsLeft: number;
  onTimeout: () => void;
  onCancel?: () => void;
}

function formatClock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function CashPaymentWaiting({
  order,
  secondsLeft,
  onTimeout,
  onCancel,
}: CashPaymentWaitingProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) {
      void cancelUnpaidOrder(order.id, 'payment_timeout').finally(onTimeout);
    }
  }, [onTimeout, order.id, secondsLeft]);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await cancelUnpaidOrder(order.id, 'customer');
      onCancel?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-ink-900 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
            Esperando efectivo
          </p>
          <h2 className="mt-3 text-4xl font-semibold uppercase tracking-tightest text-white">
            #{order.orderNumber}
          </h2>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5">
          <Banknote size={20} className="text-white" strokeWidth={1.5} />
        </div>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-y-3 text-sm">
        <dt className="text-white/45">Mesa</dt>
        <dd className="text-right text-white tabular-nums">{order.tableNumber}</dd>
        <dt className="text-white/45">A cobrar</dt>
        <dd className="text-right text-xl text-white tabular-nums">
          {formatPrice(order.totalAmount)}
        </dd>
        <dt className="text-white/45">Vence en</dt>
        <dd className="text-right text-white tabular-nums">
          {formatClock(secondsLeft)}
        </dd>
      </dl>

      <p className="mt-6 text-balance text-center text-sm leading-6 text-white/64">
        Una moza pasa por tu mesa a cobrarte. Mostrale este numero de pedido.
      </p>

      <div className="mt-5 flex justify-center gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/30" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/30 [animation-delay:160ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/30 [animation-delay:320ms]" />
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="mt-7 h-11 w-full rounded-full border border-white/15 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? 'Cancelando...' : 'Cancelar pedido'}
      </button>
    </section>
  );
}
