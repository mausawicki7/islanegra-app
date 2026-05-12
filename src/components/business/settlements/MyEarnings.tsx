import { Link } from 'react-router-dom';
import type { MonthlySettlement } from '@/types/settlement';
import { formatMonthLabel } from '@/utils/monthHelpers';
import { formatPrice } from '@/utils/formatPrice';
import { StatusBadge } from './StatusBadge';

interface MyEarningsProps {
  partnerName: string;
  settlements: MonthlySettlement[];
  drafts: { month: string; estimate: number }[];
}

export function MyEarnings({ partnerName, settlements, drafts }: MyEarningsProps) {
  const totalPaid = settlements.reduce((sum, s) => {
    const mine = s.payouts.find((p) => p.partnerName === partnerName && p.paid);
    return sum + (mine?.amount ?? 0);
  }, 0);

  const totalOwed = settlements.reduce((sum, s) => {
    const mine = s.payouts.find((p) => p.partnerName === partnerName && !p.paid);
    return sum + (mine?.amount ?? 0);
  }, 0);

  const currentYear = new Date().getFullYear();
  const yearTotal = settlements.reduce((sum, s) => {
    if (new Date(s.month).getFullYear() !== currentYear) return sum;
    const mine = s.payouts.find((p) => p.partnerName === partnerName);
    return sum + (mine?.amount ?? 0);
  }, 0);

  return (
    <section className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">
          Mis liquidaciones
        </p>
        <h1 className="mt-2 text-balance font-semibold uppercase tracking-tightest text-white text-3xl leading-[0.95]">
          {partnerName}
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label={`Acumulado ${currentYear}`}
          value={formatPrice(yearTotal)}
          hint="Confirmado + pendiente"
        />
        <Stat
          label="Cobrado total"
          value={formatPrice(totalPaid)}
          hint="Histórico"
        />
        <Stat
          label="Por cobrar"
          value={formatPrice(totalOwed)}
          hint="Liquidaciones confirmadas"
        />
      </div>

      {drafts.length > 0 && (
        <section>
          <h3 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-white/55">
            Mes en curso (estimado)
          </h3>
          <ul className="space-y-2">
            {drafts.map((d) => (
              <li
                key={d.month}
                className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-ink-800 px-5 py-4"
              >
                <div>
                  <p className="text-base font-semibold text-white">
                    {formatMonthLabel(d.month)}
                  </p>
                  <p className="mt-0.5 text-xs text-white/45">Aún no confirmado</p>
                </div>
                <p className="text-lg font-semibold text-white tabular-nums">
                  {formatPrice(d.estimate)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-white/55">
          Histórico confirmado
        </h3>
        {settlements.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.06] bg-ink-800 p-5 text-sm text-white/45">
            Todavía no tenés liquidaciones confirmadas.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.04] overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-800">
            {settlements.map((s) => {
              const mine = s.payouts.find((p) => p.partnerName === partnerName);
              if (!mine) return null;
              return (
                <li key={s.id}>
                  <Link
                    to={`/negocio/liquidaciones/${s.month.slice(0, 7)}`}
                    className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-white/[0.02]"
                  >
                    <div>
                      <p className="text-base font-semibold text-white">
                        {formatMonthLabel(s.month)}
                      </p>
                      <p className="mt-0.5 text-xs text-white/45">
                        {mine.percentage}% · {mine.paid ? 'Pagado' : 'Pendiente'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-white tabular-nums">
                        {formatPrice(mine.amount)}
                      </span>
                      <StatusBadge status={s.status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-ink-800 p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/30">{hint}</p>
    </div>
  );
}
