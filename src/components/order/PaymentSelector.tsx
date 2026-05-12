import type { PaymentMethod } from '@/types/order';

const TRANSFER_ALIAS = import.meta.env.VITE_TRANSFER_ALIAS ?? 'islanegra.mp';

interface PaymentSelectorProps {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
}

const options: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'cash', label: 'Efectivo', hint: 'Pagás en la mesa' },
  { value: 'transfer', label: 'Transferencia', hint: 'Te mostramos el alias' },
];

export function PaymentSelector({ value, onChange }: PaymentSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={selected}
              className={`flex h-auto flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition ${
                selected
                  ? 'border-white bg-white text-black'
                  : 'border-white/[0.08] bg-ink-800 text-white hover:border-white/30'
              }`}
            >
              <span className="text-sm font-semibold uppercase tracking-[0.18em]">
                {opt.label}
              </span>
              <span
                className={`text-xs ${
                  selected ? 'text-black/60' : 'text-white/50'
                }`}
              >
                {opt.hint}
              </span>
            </button>
          );
        })}
      </div>
      {value === 'transfer' && (
        <div className="rounded-xl border border-white/[0.08] bg-ink-800 p-3 text-xs text-white/65">
          Transferí a alias{' '}
          <span className="font-semibold text-white">{TRANSFER_ALIAS}</span> y
          mostranos el comprobante.
        </div>
      )}
    </div>
  );
}
