import { useCallback, useEffect, useState } from 'react';
import {
  buildLiveDraft,
  fetchSettlementByMonth,
  fetchSettlementMonths,
} from '@/services/settlementsService';
import type {
  MonthlySettlement,
  SettlementMonthView,
} from '@/types/settlement';

export function useSettlementsList() {
  const [months, setMonths] = useState<SettlementMonthView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchSettlementMonths();
      setMonths(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando liquidaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { months, loading, error, refresh };
}

export function useSettlement(monthIso: string | null) {
  const [settlement, setSettlement] = useState<MonthlySettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!monthIso) {
      setLoading(false);
      setSettlement(null);
      return;
    }
    setLoading(true);
    try {
      const persisted = await fetchSettlementByMonth(monthIso);
      if (persisted && persisted.status !== 'draft') {
        setSettlement(persisted);
      } else {
        // No row, or still draft → compute live
        const live = await buildLiveDraft(monthIso);
        if (persisted) {
          live.id = persisted.id;
          live.notes = persisted.notes;
        }
        setSettlement(live);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando liquidación');
    } finally {
      setLoading(false);
    }
  }, [monthIso]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { settlement, loading, error, refresh };
}
