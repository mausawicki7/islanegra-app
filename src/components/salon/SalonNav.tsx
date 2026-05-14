export type SalonTab = 'ready' | 'payments' | 'cocktails';

interface SalonNavProps {
  active: SalonTab;
  counts: Record<SalonTab, number>;
  onChange: (tab: SalonTab) => void;
}

const TABS: Array<{ id: SalonTab; label: string }> = [
  { id: 'ready', label: 'Listos' },
  { id: 'payments', label: 'Cobros' },
  { id: 'cocktails', label: 'Cócteles' },
];

export function SalonNav({ active, counts, onChange }: SalonNavProps) {
  return (
    <nav className="grid grid-cols-3 gap-2" aria-label="Secciones de salón">
      {TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-2 text-center transition',
              selected
                ? 'border-white bg-white text-black'
                : 'border-white/[0.08] bg-[#111111] text-white hover:border-white/20',
            ].join(' ')}
            aria-pressed={selected}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">
              {tab.label}
            </span>
            <span
              className={[
                'min-w-6 rounded-full px-2 py-0.5 text-[11px] tabular-nums',
                selected ? 'bg-black text-white' : 'bg-white/[0.08] text-white/60',
              ].join(' ')}
            >
              {counts[tab.id]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
