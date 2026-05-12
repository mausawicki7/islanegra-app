import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  /** % change vs previous period; null = N/A. */
  delta?: number | null;
  hint?: string;
}

function deltaTone(delta: number | null | undefined) {
  if (delta == null) return { text: 'text-white/45', icon: Minus, label: 'N/A' };
  if (delta > 0.5) return { text: 'text-emerald-300', icon: ArrowUpRight, label: `+${delta.toFixed(1)}%` };
  if (delta < -0.5) return { text: 'text-red-300', icon: ArrowDownRight, label: `${delta.toFixed(1)}%` };
  return { text: 'text-white/55', icon: Minus, label: '=' };
}

export function KPICard({ label, value, subtitle, delta, hint }: KPICardProps) {
  const tone = deltaTone(delta);
  const Icon = tone.icon;
  return (
    <article className="flex flex-col justify-between gap-2 rounded-2xl border border-white/[0.06] bg-ink-800 p-4 sm:gap-4 sm:p-5">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-white sm:mt-3 sm:text-3xl">
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-white/55">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.18em]">
        <span className={`inline-flex items-center gap-1 ${tone.text}`}>
          <Icon size={12} />
          {tone.label}
        </span>
        <span className="hidden text-white/30 sm:inline">vs período anterior</span><span className="text-white/30 sm:hidden">vs ant.</span>
      </div>
      {hint && (
        <p className="-mt-2 text-[10px] uppercase tracking-[0.16em] text-white/30">
          {hint}
        </p>
      )}
    </article>
  );
}
