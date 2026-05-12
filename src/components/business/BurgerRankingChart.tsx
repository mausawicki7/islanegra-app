import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BurgerRanking } from '@/services/businessService';

interface BurgerRankingChartProps {
  data: BurgerRanking[];
}

export function BurgerRankingChart({ data }: BurgerRankingChartProps) {
  const empty = data.length === 0;
  return (
    <article className="rounded-2xl border border-white/[0.06] bg-ink-800 p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
          Ranking de burgers
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
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.slice(0, 6)}
              layout="vertical"
              margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }}
                tickLine={false}
                axisLine={false}
                width={140}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(value) => [`${Number(value)} u`, 'Vendidas']}
              />
              <Bar
                dataKey="units"
                fill="rgba(255,255,255,0.85)"
                radius={[0, 4, 4, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
