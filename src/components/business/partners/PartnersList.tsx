import { useState } from 'react';
import { Pencil, UserMinus, UserPlus } from 'lucide-react';
import {
  createPartner,
  deactivatePartner,
  updatePartner,
  type PartnerInput,
} from '@/services/partnersService';
import type { Partner } from '@/types/settlement';
import { PartnerEditor } from './PartnerEditor';

interface PartnersListProps {
  partners: Partner[];
  onRefresh: () => Promise<void>;
}

export function PartnersList({ partners, onRefresh }: PartnersListProps) {
  const [editing, setEditing] = useState<Partner | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalPct = partners
    .filter((p) => p.active)
    .reduce((sum, p) => sum + p.percentage, 0);

  const onCreate = async (input: PartnerInput) => {
    setError(null);
    try {
      await createPartner(input);
      setCreating(false);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear');
    }
  };

  const onUpdate = async (id: string, input: PartnerInput) => {
    setError(null);
    try {
      await updatePartner(id, input);
      setEditing(null);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  };

  const onDeactivate = async (p: Partner) => {
    if (!window.confirm(`¿Dar de baja a ${p.name}? No afecta liquidaciones ya confirmadas.`)) return;
    setBusyId(p.id);
    setError(null);
    try {
      await deactivatePartner(p.id);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dar de baja');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">Socios</p>
          <h1 className="mt-2 text-balance font-semibold uppercase tracking-tightest text-white text-3xl leading-[0.95]">
            Sociedad
          </h1>
          <p className="mt-2 text-xs text-white/45">
            Total porcentajes activos: <span className="text-white tabular-nums">{totalPct}%</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-black hover:bg-white/90"
        >
          <UserPlus size={14} /> Nuevo socio
        </button>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      <ul className="divide-y divide-white/[0.04] overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-800">
        {partners.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-white">
                {p.name}
                {!p.active && (
                  <span className="ml-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
                    inactivo
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-white/45">
                {p.percentage}% · desde {p.startDate}
                {p.endDate ? ` · hasta ${p.endDate}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(p)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/70 hover:border-white/25 hover:text-white"
              >
                <Pencil size={12} /> Editar
              </button>
              {p.active && (
                <button
                  type="button"
                  onClick={() => onDeactivate(p)}
                  disabled={busyId === p.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/70 hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
                >
                  <UserMinus size={12} /> Dar de baja
                </button>
              )}
            </div>
          </li>
        ))}
        {partners.length === 0 && (
          <li className="px-5 py-6 text-sm text-white/45">
            Aún no hay socios registrados.
          </li>
        )}
      </ul>

      {creating && (
        <PartnerEditor
          onSubmit={onCreate}
          onCancel={() => setCreating(false)}
        />
      )}
      {editing && (
        <PartnerEditor
          initial={editing}
          onSubmit={(input) => onUpdate(editing.id, input)}
          onCancel={() => setEditing(null)}
        />
      )}
    </section>
  );
}
