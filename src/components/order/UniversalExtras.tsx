import { Minus, Plus } from 'lucide-react';
import type { UniversalExtra } from '@/types/customization';
import { formatPrice } from '@/utils/formatPrice';

interface UniversalExtrasProps {
  extras: UniversalExtra[];
  quantities: Record<string, number>;
  onIncrement: (extra: UniversalExtra) => void;
  onDecrement: (extra: UniversalExtra) => void;
  onToggle: (extra: UniversalExtra) => void;
}

export function UniversalExtras({
  extras,
  quantities,
  onIncrement,
  onDecrement,
  onToggle,
}: UniversalExtrasProps) {
  if (extras.length === 0) return null;
  return (
    <section className="mt-7">
      <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">
        Sumá algo
      </p>
      <ul className="space-y-2">
        {extras.map((extra) => {
          const qty = quantities[extra.id] ?? 0;
          if (extra.selectionType === 'counter') {
            const atMax = qty >= extra.maxQuantity;
            return (
              <li
                key={extra.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-ink-800 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">
                    {extra.emoji && <span className="mr-2">{extra.emoji}</span>}
                    {extra.name}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-amber-200/90">
                    +{formatPrice(extra.price)} c/u
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDecrement(extra)}
                    disabled={qty <= 0}
                    aria-label={`Quitar ${extra.name}`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="inline-flex h-11 min-w-[2.25rem] items-center justify-center text-base font-semibold tabular-nums text-white">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => onIncrement(extra)}
                    disabled={atMax}
                    aria-label={`Sumar ${extra.name}`}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-black/60"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </li>
            );
          }
          // toggle
          const on = qty > 0;
          return (
            <li
              key={extra.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-ink-800 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">
                  {extra.emoji && <span className="mr-2">{extra.emoji}</span>}
                  {extra.name}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-amber-200/90">
                  +{formatPrice(extra.price)}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={extra.name}
                onClick={() => onToggle(extra)}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
                  on
                    ? 'border-white bg-white'
                    : 'border-white/20 bg-white/5'
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full transition ${
                    on ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white/70'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
