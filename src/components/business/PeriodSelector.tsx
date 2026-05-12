import { useState } from 'react';
import { PERIOD_OPTIONS, type PeriodKey, type PeriodRange } from '@/utils/periodHelpers';

interface PeriodSelectorProps {
  period: PeriodRange;
  onChange: (key: PeriodKey) => void;
  onCustom: (range: { start: string; end: string }) => void;
}

export function PeriodSelector({ period, onChange, onCustom }: PeriodSelectorProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(() =>
    new Date(period.start).toISOString().slice(0, 10),
  );
  const [customEnd, setCustomEnd] = useState(() => {
    const d = new Date(period.end);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIOD_OPTIONS.map((opt) => {
        const selected = period.key === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              if (opt.key === 'custom') {
                setCustomOpen((v) => !v);
              } else {
                setCustomOpen(false);
                onChange(opt.key);
              }
            }}
            aria-pressed={selected}
            className={`inline-flex h-9 items-center justify-center rounded-full px-4 text-[11px] uppercase tracking-[0.18em] transition ${
              selected
                ? 'bg-white text-black'
                : 'border border-white/[0.08] bg-ink-800 text-white/70 hover:border-white/25 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
      <span className="ml-2 text-[11px] uppercase tracking-[0.22em] text-white/35">
        {period.label}
      </span>

      {customOpen && (
        <div className="mt-2 flex w-full flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-ink-800 px-4 py-3 sm:w-auto">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-md border border-white/[0.08] bg-ink-900 px-2 py-1.5 text-sm text-white"
          />
          <span className="text-white/35">—</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-md border border-white/[0.08] bg-ink-900 px-2 py-1.5 text-sm text-white"
          />
          <button
            type="button"
            onClick={() => {
              onCustom({ start: customStart, end: customEnd });
              setCustomOpen(false);
            }}
            className="inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-[11px] uppercase tracking-[0.18em] text-black hover:bg-white/90"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
