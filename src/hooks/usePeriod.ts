import { useCallback, useMemo, useState } from 'react';
import {
  buildPeriod,
  type CustomRange,
  type PeriodKey,
  type PeriodRange,
} from '@/utils/periodHelpers';

const STORAGE_KEY = 'islanegra:business:period';

interface StoredPeriod {
  key: PeriodKey;
  custom?: CustomRange;
}

function load(): StoredPeriod {
  if (typeof window === 'undefined') return { key: 'today' };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { key: 'today' };
    const parsed = JSON.parse(raw) as StoredPeriod;
    return parsed.key ? parsed : { key: 'today' };
  } catch {
    return { key: 'today' };
  }
}

function save(value: StoredPeriod) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function usePeriod() {
  const [state, setState] = useState<StoredPeriod>(() => load());

  const period: PeriodRange = useMemo(
    () => buildPeriod(state.key, state.custom),
    [state.key, state.custom],
  );

  const setKey = useCallback((key: PeriodKey) => {
    setState((prev) => {
      const next = { ...prev, key };
      save(next);
      return next;
    });
  }, []);

  const setCustom = useCallback((custom: CustomRange) => {
    setState(() => {
      const next: StoredPeriod = { key: 'custom', custom };
      save(next);
      return next;
    });
  }, []);

  return { period, setKey, setCustom };
}
