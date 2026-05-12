import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 20,
}: QuantitySelectorProps) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-ink-800 p-1">
      <button
        type="button"
        aria-label="Restar"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-11 w-11 items-center justify-center rounded-full text-white transition disabled:text-white/25 enabled:hover:bg-white/5"
      >
        <Minus size={18} />
      </button>
      <span className="min-w-[2ch] text-center text-lg font-semibold tabular-nums text-white">
        {value}
      </span>
      <button
        type="button"
        aria-label="Sumar"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-11 w-11 items-center justify-center rounded-full text-white transition disabled:text-white/25 enabled:hover:bg-white/5"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
