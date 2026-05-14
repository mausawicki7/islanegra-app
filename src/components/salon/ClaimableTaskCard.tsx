import { Check, Hand, RotateCcw } from 'lucide-react';
import { useClaimableTask } from '@/hooks/useClaimableTask';
import type { SalonOrder } from '@/types/salon';
import { timeAgo } from '@/utils/timeAgo';

interface ClaimableTaskCardProps {
  order: SalonOrder;
  staffName: string;
  onSettled: () => void;
}

export function ClaimableTaskCard({ order, staffName, onSettled }: ClaimableTaskCardProps) {
  const task = useClaimableTask(order, staffName, onSettled);
  const isClaimedByOther = task.claimState === 'claimed-by-other';
  const isClaimedByMe = task.claimState === 'claimed-by-me';
  const readyLabel = order.readyAt ? timeAgo(order.readyAt) : timeAgo(order.createdAt);

  return (
    <article
      className={[
        'rounded-2xl border bg-[#111111] p-4 transition',
        isClaimedByMe
          ? 'border-white/35'
          : isClaimedByOther
            ? 'border-white/[0.06] opacity-60'
            : 'border-white/[0.08]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">
            Pedido {order.orderNumber}
          </p>
          <h2 className="mt-1 text-4xl font-semibold tracking-normal text-white">
            Mesa {order.tableNumber}
          </h2>
        </div>
        <div className="shrink-0 rounded-full border border-white/[0.08] px-3 py-1.5 text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Listo</p>
          <p className="text-xs text-white/70">{readyLabel}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-3 text-sm text-white/78">
            <span className="w-7 shrink-0 text-white tabular-nums">{item.quantity}x</span>
            <span className="min-w-0 flex-1">{item.productName}</span>
          </li>
        ))}
      </ul>

      {order.note && (
        <p className="mt-4 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white/70">
          {order.note}
        </p>
      )}

      <div className="mt-4 min-h-6">
        {task.claimedBy ? (
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">
            Lo tomó <span className="text-white/80">{task.claimedBy}</span>
          </p>
        ) : (
          <p className="text-xs uppercase tracking-[0.18em] text-white/35">
            Sin tomar
          </p>
        )}
        {task.error && (
          <p role="alert" className="mt-2 text-sm text-red-200">
            {task.error}
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        {isClaimedByMe ? (
          <button
            type="button"
            onClick={task.complete}
            disabled={task.busy}
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold uppercase tracking-[0.18em] text-black transition disabled:cursor-wait disabled:opacity-60"
          >
            <Check size={18} /> Entregado
          </button>
        ) : (
          <button
            type="button"
            onClick={isClaimedByOther ? task.complete : task.claim}
            disabled={task.busy}
            className={[
              'flex h-14 items-center justify-center gap-2 rounded-xl text-sm font-semibold uppercase tracking-[0.18em] transition disabled:cursor-wait disabled:opacity-60',
              isClaimedByOther
                ? 'border border-white/[0.08] bg-transparent text-white/70'
                : 'bg-white text-black',
            ].join(' ')}
          >
            {isClaimedByOther ? <Check size={18} /> : <Hand size={18} />}
            {isClaimedByOther ? 'Entregado' : 'Voy yo'}
          </button>
        )}
        {task.claimedBy && (
          <button
            type="button"
            onClick={task.release}
            disabled={task.busy}
            className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.08] text-white/65 transition hover:border-white/20 hover:text-white disabled:cursor-wait disabled:opacity-50"
            aria-label="Soltar tarea"
          >
            <RotateCcw size={18} />
          </button>
        )}
      </div>
    </article>
  );
}
