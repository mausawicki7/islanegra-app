import type { PartnerPayout } from '@/types/settlement';
import { formatPrice } from '@/utils/formatPrice';

interface PayoutRowProps {
  payout: PartnerPayout;
  canEdit: boolean;
  immutable: boolean;
  onTogglePaid?: (next: boolean) => void;
  busy?: boolean;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function PayoutRow({
  payout,
  canEdit,
  immutable,
  onTogglePaid,
  busy = false,
}: PayoutRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-ink-800 px-5 py-4">
      <div>
        <p className="text-base font-semibold text-white">{payout.partnerName}</p>
        <p className="mt-0.5 text-xs text-white/45">
          {payout.percentage}% sobre ingresos cobrados
        </p>
      </div>

      <div className="text-right">
        <p className="text-lg font-semibold text-white tabular-nums">
          {formatPrice(payout.amount)}
        </p>
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-white/45">
          {payout.paid ? `Pagado ${fmtDate(payout.paidAt)}` : immutable ? 'Pendiente de pago' : 'Cálculo en vivo'}
        </p>
      </div>

      {immutable && (
        <label
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition ${
            payout.paid
              ? 'border-emerald-400/40 bg-emerald-400/[0.06] text-emerald-200'
              : 'border-white/[0.08] bg-ink-900 text-white/70'
          } ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
        >
          <input
            type="checkbox"
            checked={payout.paid}
            disabled={!canEdit || busy}
            onChange={(e) => onTogglePaid?.(e.target.checked)}
            className="h-4 w-4 accent-emerald-300"
          />
          {payout.paid ? 'Pagado' : 'Marcar como pagado'}
        </label>
      )}
    </div>
  );
}
