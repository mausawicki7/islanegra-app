import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { SettlementMonthView } from '@/types/settlement';
import { formatMonthLabel, isCurrentMonth } from '@/utils/monthHelpers';
import { formatPrice } from '@/utils/formatPrice';
import { StatusBadge } from './StatusBadge';

interface SettlementsListProps {
  months: SettlementMonthView[];
}

export function SettlementsList({ months }: SettlementsListProps) {
  if (months.length === 0) {
    return (
      <p className="rounded-2xl border border-white/[0.06] bg-ink-800 p-6 text-sm text-white/45">
        Todavía no hay ventas registradas. Cuando entre el primer pedido cobrado, va a aparecer el mes acá.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.04] overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-800">
      {months.map((m) => {
        const monthLabel = formatMonthLabel(m.month);
        const current = isCurrentMonth(m.month);
        return (
          <li key={m.month}>
            <Link
              to={`/negocio/liquidaciones/${m.month.slice(0, 7)}`}
              className="flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-white/[0.02] sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">
                  {monthLabel}
                  {current && (
                    <span className="ml-2 text-[10px] uppercase tracking-[0.22em] text-white/45">
                      en curso
                    </span>
                  )}
                </p>
                <p className="mt-1 truncate text-xs text-white/50">
                  Cobrado: {formatPrice(m.grossRevenue)} · A pagar:{' '}
                  {formatPrice(m.totalPayouts)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <StatusBadge status={m.status} />
                <ChevronRight size={16} className="text-white/35" />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
