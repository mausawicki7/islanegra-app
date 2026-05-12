import { useState } from 'react';
import { X } from 'lucide-react';
import type { PartnerInput } from '@/services/partnersService';
import type { Partner } from '@/types/settlement';

interface PartnerEditorProps {
  initial?: Partner;
  onSubmit: (input: PartnerInput) => Promise<void> | void;
  onCancel: () => void;
}

export function PartnerEditor({ initial, onSubmit, onCancel }: PartnerEditorProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [percentage, setPercentage] = useState<string>(
    initial ? String(initial.percentage) : '5',
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(percentage);
    if (!name.trim() || Number.isNaN(pct) || pct < 0 || pct > 100) return;
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), percentage: pct, active });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCancel}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-white/[0.08] bg-ink-900 p-6 sm:rounded-3xl"
      >
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onCancel}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">
          Socio
        </p>
        <h2 className="mt-2 text-balance font-semibold uppercase tracking-tightest text-white text-2xl leading-[0.95]">
          {initial ? 'Editar' : 'Nuevo socio'}
        </h2>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-[0.22em] text-white/45">
              Nombre
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-white/[0.08] bg-ink-800 px-4 py-3 text-base text-white focus:border-white/30 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-[0.22em] text-white/45">
              Porcentaje
            </span>
            <input
              type="number"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              min={0}
              max={100}
              step={0.5}
              required
              className="mt-1 w-full rounded-xl border border-white/[0.08] bg-ink-800 px-4 py-3 text-base text-white focus:border-white/30 focus:outline-none"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4"
            />
            Activo
          </label>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-white/45">
          Los cambios solo aplican a futuras liquidaciones. Liquidaciones ya
          confirmadas son inmutables.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-white/15 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:border-white/30"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-white text-[11px] font-semibold uppercase tracking-[0.18em] text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30"
          >
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
