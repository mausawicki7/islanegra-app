import { Banknote, CreditCard } from 'lucide-react';
import { CASH_DISCOUNT_PERCENT } from '@/config/pricing';
import type { PaymentMethod } from '@/types/payment';
import type { PaymentTotals } from '@/types/payment';
import { formatPrice } from '@/utils/formatPrice';

interface PaymentMethodSelectorProps {
  value: PaymentMethod | null;
  cashTotals: PaymentTotals;
  mercadoPagoTotals: PaymentTotals;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({
  value,
  cashTotals,
  mercadoPagoTotals,
  onChange,
}: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange('cash')}
        aria-pressed={value === 'cash'}
        className={`rounded-2xl border p-4 text-left transition ${
          value === 'cash'
            ? 'border-white bg-white text-black'
            : 'border-white/[0.08] bg-ink-800 text-white hover:border-white/30'
        }`}
      >
        <span className="flex items-center justify-between gap-3">
          <Banknote size={20} />
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
              value === 'cash' ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            {CASH_DISCOUNT_PERCENT}% off
          </span>
        </span>
        <span className="mt-5 block text-sm font-semibold uppercase tracking-[0.18em]">
          Efectivo
        </span>
        <span className="mt-2 block text-2xl tabular-nums">
          {formatPrice(cashTotals.total)}
        </span>
        <span
          className={`mt-1 block text-xs tabular-nums line-through ${
            value === 'cash' ? 'text-black/45' : 'text-white/35'
          }`}
        >
          {formatPrice(cashTotals.subtotal)}
        </span>
        <span
          className={`mt-3 block text-xs leading-5 ${
            value === 'cash' ? 'text-black/60' : 'text-white/55'
          }`}
        >
          Una moza pasa por tu mesa antes de que entre a cocina.
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChange('mercadopago')}
        aria-pressed={value === 'mercadopago'}
        className={`rounded-2xl border p-4 text-left transition ${
          value === 'mercadopago'
            ? 'border-white bg-white text-black'
            : 'border-white/[0.08] bg-ink-800 text-white hover:border-white/30'
        }`}
      >
        <span className="flex items-center justify-between gap-3">
          <CreditCard size={20} />
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
              value === 'mercadopago' ? 'text-black/50' : 'text-white/45'
            }`}
          >
            Online
          </span>
        </span>
        <span className="mt-5 block text-sm font-semibold uppercase tracking-[0.18em]">
          MercadoPago
        </span>
        <span className="mt-2 block text-2xl tabular-nums">
          {formatPrice(mercadoPagoTotals.total)}
        </span>
        <span
          className={`mt-3 block text-xs leading-5 ${
            value === 'mercadopago' ? 'text-black/60' : 'text-white/55'
          }`}
        >
          Tarjetas, debito, saldo MP, Pago Facil y Rapipago.
        </span>
      </button>
    </div>
  );
}
