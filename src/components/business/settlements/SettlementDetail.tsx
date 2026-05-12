import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCheck, Printer, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MonthlySettlement, PartnerPayout } from '@/types/settlement';
import { formatMonthLabel } from '@/utils/monthHelpers';
import { formatPrice } from '@/utils/formatPrice';
import {
  confirmSettlement,
  togglePayoutPaid,
  updateSettlementNotes,
} from '@/services/settlementsService';
import type { UserRole } from '@/services/authService';
import { StatusBadge } from './StatusBadge';
import { PayoutRow } from './PayoutRow';
import { PrintableSettlement } from './PrintableSettlement';

interface SettlementDetailProps {
  settlement: MonthlySettlement;
  role: UserRole;
  onRefresh: () => Promise<void>;
}

export function SettlementDetail({ settlement, role, onRefresh }: SettlementDetailProps) {
  const immutable = settlement.status !== 'draft';
  const canConfirm = role === 'owner' && settlement.status === 'draft';
  const canMarkPaid = role === 'owner' && immutable;
  const canEditNotes = role === 'owner';

  const [confirming, setConfirming] = useState(false);
  const [busyPayoutId, setBusyPayoutId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notes, setNotes] = useState(settlement.notes ?? '');
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [printingPayout, setPrintingPayout] = useState<PartnerPayout | null>(null);
  const [printingFull, setPrintingFull] = useState(false);

  useEffect(() => {
    setNotes(settlement.notes ?? '');
    setNotesDirty(false);
  }, [settlement.id, settlement.notes]);

  const totalPayouts = useMemo(
    () => settlement.payouts.reduce((sum, p) => sum + p.amount, 0),
    [settlement.payouts],
  );
  const totalPaid = useMemo(
    () => settlement.payouts.filter((p) => p.paid).reduce((s, p) => s + p.amount, 0),
    [settlement.payouts],
  );

  const handleConfirm = async () => {
    const ok = window.confirm(
      `Confirmar liquidación de ${formatMonthLabel(settlement.month)}? Una vez confirmada, los montos quedan congelados y no se pueden modificar.`,
    );
    if (!ok) return;
    setConfirming(true);
    setActionError(null);
    try {
      await confirmSettlement(settlement.month);
      await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo confirmar');
    } finally {
      setConfirming(false);
    }
  };

  const handleTogglePaid = async (payout: PartnerPayout, next: boolean) => {
    setBusyPayoutId(payout.id);
    setActionError(null);
    try {
      await togglePayoutPaid(payout.id, next);
      await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo actualizar el pago');
    } finally {
      setBusyPayoutId(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!immutable) return;
    setNotesSaving(true);
    setActionError(null);
    try {
      await updateSettlementNotes(settlement.id, notes);
      setNotesDirty(false);
      await onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo guardar la nota');
    } finally {
      setNotesSaving(false);
    }
  };

  const printAll = () => {
    setPrintingFull(true);
    setPrintingPayout(null);
    // Allow the printable subtree to render before triggering print.
    requestAnimationFrame(() => {
      window.print();
      setPrintingFull(false);
    });
  };

  const printPayout = (p: PartnerPayout) => {
    setPrintingFull(false);
    setPrintingPayout(p);
    requestAnimationFrame(() => {
      window.print();
      setPrintingPayout(null);
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/negocio/liquidaciones"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/55 hover:text-white"
        >
          <ArrowLeft size={14} /> Volver
        </Link>
        <StatusBadge status={settlement.status} />
      </div>

      <header>
        <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">
          Liquidación
        </p>
        <h1 className="mt-2 text-balance font-semibold uppercase tracking-tightest text-white text-3xl leading-[0.95]">
          {formatMonthLabel(settlement.month)}
        </h1>
        {immutable && settlement.confirmedAt && (
          <p className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-emerald-300/80">
            <ShieldCheck size={12} /> Snapshot inmutable · confirmada{' '}
            {new Date(settlement.confirmedAt).toLocaleDateString('es-AR')}
          </p>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.06] bg-ink-800 p-5">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
            Ingresos cobrados
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
            {formatPrice(settlement.grossRevenue)}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/30">
            Status delivered en el mes
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-ink-800 p-5">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
            A pagar a socios
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
            {formatPrice(totalPayouts)}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/30">
            Total acumulado
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-ink-800 p-5">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
            Ya pagado
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
            {formatPrice(totalPaid)}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/30">
            {totalPayouts > 0
              ? `${Math.round((totalPaid / totalPayouts) * 100)}% de la liquidación`
              : '—'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {settlement.payouts.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.06] bg-ink-800 p-5 text-sm text-white/45">
            No hay socios activos para liquidar este mes.
          </p>
        ) : (
          settlement.payouts.map((p) => (
            <div key={p.id} className="space-y-2">
              <PayoutRow
                payout={p}
                canEdit={canMarkPaid}
                immutable={immutable}
                onTogglePaid={(next) => handleTogglePaid(p, next)}
                busy={busyPayoutId === p.id}
              />
              {immutable && (
                <button
                  type="button"
                  onClick={() => printPayout(p)}
                  className="ml-auto inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/50 hover:text-white"
                >
                  <Printer size={12} /> Recibo {p.partnerName.split(' ')[0]}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200"
        >
          {actionError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {canConfirm && (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming || settlement.payouts.length === 0}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-black/60"
          >
            <CheckCheck size={16} /> {confirming ? 'Confirmando…' : 'Confirmar liquidación'}
          </button>
        )}
        {immutable && (
          <button
            type="button"
            onClick={printAll}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-[11px] uppercase tracking-[0.18em] text-white hover:border-white/30"
          >
            <Printer size={14} /> Exportar PDF (todo el mes)
          </button>
        )}
      </div>

      {immutable && (
        <section className="rounded-2xl border border-white/[0.06] bg-ink-800 p-5">
          <header className="mb-3 flex items-baseline justify-between">
            <h3 className="text-[11px] uppercase tracking-[0.22em] text-white/55">
              Notas internas
            </h3>
            {canEditNotes && notesDirty && (
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="text-[10px] uppercase tracking-[0.18em] text-emerald-300 hover:text-emerald-200 disabled:opacity-50"
              >
                {notesSaving ? 'Guardando…' : 'Guardar'}
              </button>
            )}
          </header>
          {canEditNotes ? (
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesDirty(true);
              }}
              rows={3}
              placeholder="Observaciones sobre esta liquidación (opcional)…"
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-ink-900 px-3 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-white/70">
              {settlement.notes || '—'}
            </p>
          )}
        </section>
      )}

      {(printingFull || printingPayout) && (
        <PrintableSettlement
          settlement={settlement}
          payout={printingPayout ?? undefined}
        />
      )}
    </section>
  );
}
