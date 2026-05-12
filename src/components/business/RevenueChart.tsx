import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RevenueByDay } from '@/services/businessService';
import { formatPrice } from '@/utils/formatPrice';

interface RevenueChartProps {
  data: RevenueByDay[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <article className="rounded-2xl border border-white/[0.06] bg-ink-800 p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
          Ingresos por día
        </h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
          Solo pedidos cobrados
        </span>
      </header>
      <div className="h-52 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.55)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{
                backgroundColor: '#0a0a0a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
              formatter={(value) => [formatPrice(Number(value)), 'Ingresos']}
            />
            <Bar
              dataKey="revenue"
              fill="rgba(255,255,255,0.85)"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
