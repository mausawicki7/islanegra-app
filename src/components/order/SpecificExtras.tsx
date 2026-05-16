import type { SpecificExtra } from '@/types/customization';
import { formatPrice } from '@/utils/formatPrice';

interface SpecificExtrasProps {
  extras: SpecificExtra[];
  selected: Record<string, boolean>;
  onToggle: (extra: SpecificExtra) => void;
}

export function SpecificExtras({ extras, selected, onToggle }: SpecificExtrasProps) {
  if (extras.length === 0) return null;
  return (
    <section className="mt-7">
      <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">
        Para esta burger
      </p>
      <ul className="space-y-2">
        {extras.map((extra) => {
          const on = !!selected[extra.id];
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
