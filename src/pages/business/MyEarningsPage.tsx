import { useEffect, useState } from 'react';
import { MyEarnings } from '@/components/business/settlements/MyEarnings';
import {
  buildLiveDraft,
  fetchSettlements,
} from '@/services/settlementsService';
import type { MonthlySettlement } from '@/types/settlement';
import { firstOfMonth } from '@/utils/monthHelpers';
import { usePageTitle } from '@/hooks/usePageTitle';

interface MyEarningsPageProps {
  partnerName: string;
}

export function MyEarningsPage({ partnerName }: MyEarningsPageProps) {
  usePageTitle('Mis liquidaciones · Negocio');
  const [settlements, setSettlements] = useState<MonthlySettlement[]>([]);
  const [draftEstimate, setDraftEstimate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [all, currentDraft] = await Promise.all([
          fetchSettlements(),
          buildLiveDraft(firstOfMonth(new Date())),
        ]);
        if (cancelled) return;
        setSettlements(all.filter((s) => s.status !== 'draft'));
        const mine = currentDraft.payouts.find((p) => p.partnerName === partnerName);
        setDraftEstimate(mine?.amount ?? 0);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando datos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [partnerName]);

  if (loading) {
    return <p className="text-sm text-white/45">Cargando…</p>;
  }
  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200">
        {error}
      </p>
    );
  }

  const currentMonth = firstOfMonth(new Date());

  return (
    <MyEarnings
      partnerName={partnerName}
      settlements={settlements}
      drafts={
        draftEstimate !== null
          ? [{ month: currentMonth, estimate: draftEstimate }]
          : []
      }
    />
  );
}
