import type { SettlementStatus } from '@/types/settlement';

const TONES: Record<SettlementStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-white/10 text-white/70' },
  confirmed: { label: 'Confirmada', cls: 'bg-emerald-400/15 text-emerald-300' },
  paid: { label: 'Pagada', cls: 'bg-emerald-300/25 text-emerald-200' },
};

export function StatusBadge({ status }: { status: SettlementStatus }) {
  const t = TONES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${t.cls}`}
    >
      {t.label}
    </span>
  );
}
