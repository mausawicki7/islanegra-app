import type { OperationalTimings } from '@/services/businessService';

interface OperationalMetricsProps {
  data: OperationalTimings;
}

function fmtMinutes(value: number | null): string {
  if (value == null) return '—';
  if (value < 1) return `${Math.round(value * 60)} s`;
  return `${value.toFixed(1)} min`;
}

export function OperationalMetrics({ data }: OperationalMetricsProps) {
  return (
    <article className="rounded-2xl border border-white/[0.06] bg-ink-800 p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
          Tiempos operativos
        </h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
          Pedidos cobrados
        </span>
      </header>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.22em] text-white/45">
            Preparación promedio
          </dt>
          <dd className="mt-1.5 text-xl font-semibold tabular-nums text-white sm:mt-2 sm:text-2xl">
            {fmtMinutes(data.avgPrepMinutes)}
          </dd>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/35">
            preparing → ready
          </p>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.22em] text-white/45">
            Entrega total
          </dt>
          <dd className="mt-1.5 text-xl font-semibold tabular-nums text-white sm:mt-2 sm:text-2xl">
            {fmtMinutes(data.avgTotalMinutes)}
          </dd>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/35">
            created → delivered
          </p>
        </div>
      </dl>
      <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-white/30">
        Muestra: {data.sampleSize} pedido{data.sampleSize === 1 ? '' : 's'}
      </p>
    </article>
  );
}
