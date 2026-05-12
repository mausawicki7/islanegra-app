import type { HeatmapCell } from '@/services/businessService';

interface HoursHeatmapProps {
  cells: HeatmapCell[];
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function intensityColor(ratio: number): string {
  // ratio in [0,1]. Pure black for 0, warm white for 1.
  const alpha = 0.03 + ratio * 0.9;
  return `rgba(255,255,255,${alpha})`;
}

export function HoursHeatmap({ cells }: HoursHeatmapProps) {
  const max = cells.reduce((m, c) => (c.count > m ? c.count : m), 0);
  const empty = max === 0;

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-ink-800 p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
          Horarios pico
        </h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
          Pedidos por hora · todos los estados
        </span>
      </header>

      {empty ? (
        <p className="py-12 text-center text-sm text-white/35">
          Sin actividad registrada en el período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-[2px]">
            <thead>
              <tr>
                <th aria-hidden className="w-9" />
                {Array.from({ length: 24 }, (_, h) => (
                  <th
                    key={h}
                    className="text-center text-[9px] font-normal text-white/35 tabular-nums"
                  >
                    {h % 3 === 0 ? h : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAY_LABELS.map((label, dayIdx) => (
                <tr key={label}>
                  <th
                    scope="row"
                    className="pr-2 text-right text-[10px] font-normal uppercase tracking-[0.18em] text-white/45"
                  >
                    {label}
                  </th>
                  {Array.from({ length: 24 }, (_, h) => {
                    const cell = cells.find(
                      (c) => c.day === dayIdx && c.hour === h,
                    );
                    const count = cell?.count ?? 0;
                    const ratio = max > 0 ? count / max : 0;
                    return (
                      <td
                        key={h}
                        title={`${label} ${String(h).padStart(2, '0')}:00 — ${count} pedidos`}
                        aria-label={`${label} ${h} horas, ${count} pedidos`}
                        className="h-6 rounded-[3px] text-center text-[9px]"
                        style={{ backgroundColor: intensityColor(ratio) }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
