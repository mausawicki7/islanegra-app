import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { PaymentSplit } from '@/services/businessService';
import { formatPrice } from '@/utils/formatPrice';

interface PaymentMethodChartProps {
  data: PaymentSplit[];
}

const COLORS = [
  'rgba(255,255,255,0.85)',
  'rgba(255,255,255,0.45)',
  'rgba(255,255,255,0.22)',
];

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const total = data.reduce((sum, b) => sum + b.amount, 0);
  const empty = total === 0;

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-ink-800 p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
          Método de pago
        </h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
          Solo pedidos cobrados
        </span>
      </header>
      {empty ? (
        <p className="py-12 text-center text-sm text-white/35">
          Sin ventas en el período.
        </p>
      ) : (
        <div className="grid items-center gap-4 sm:grid-cols-[1fr_1fr]">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="label"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx] ?? COLORS[1]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value) => [formatPrice(Number(value)), 'Monto']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-3">
            {data.map((b, idx) => {
              const pct = total > 0 ? (b.amount / total) * 100 : 0;
              return (
                <li key={b.method} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-white">
                      <span
                        aria-hidden
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[idx] }}
                      />
                      {b.label}
                    </span>
                    <span className="text-white/70 tabular-nums">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-xs text-white/45">
                    <span>{b.count} {b.count === 1 ? 'pedido' : 'pedidos'}</span>
                    <span className="tabular-nums">{formatPrice(b.amount)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}
