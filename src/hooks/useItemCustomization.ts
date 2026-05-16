import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchBurgerCustomization } from '@/services/extrasService';
import type {
  BurgerCustomizationData,
} from '@/services/extrasService';
import type { UniversalExtra, SpecificExtra } from '@/types/customization';

export interface CustomizationPayload {
  universalExtras: Array<{ extraId: string; qty: number }>;
  specificExtras: string[];
  removedIngredients: string[];
  note: string | null;
}

export interface UseItemCustomizationResult {
  loading: boolean;
  error: string | null;
  data: BurgerCustomizationData | null;
  universalQty: Record<string, number>;
  specificSelected: Record<string, boolean>;
  removed: Record<string, boolean>;
  note: string;
  extrasUnitTotal: number;
  setUniversalQty: (extraId: string, qty: number) => void;
  incrementUniversal: (extra: UniversalExtra) => void;
  decrementUniversal: (extra: UniversalExtra) => void;
  toggleSpecific: (extra: SpecificExtra) => void;
  toggleRemoved: (ingredientId: string) => void;
  setNote: (value: string) => void;
  reset: () => void;
  toPayload: () => CustomizationPayload;
}

export function useItemCustomization(
  productId: string | null | undefined,
): UseItemCustomizationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BurgerCustomizationData | null>(null);

  const [universalQty, setUniversalQtyState] = useState<Record<string, number>>({});
  const [specificSelected, setSpecificSelected] = useState<Record<string, boolean>>({});
  const [removed, setRemoved] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');

  const reset = useCallback(() => {
    setUniversalQtyState({});
    setSpecificSelected({});
    setRemoved({});
    setNote('');
  }, []);

  useEffect(() => {
    if (!productId) {
      setData(null);
      reset();
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBurgerCustomization(productId)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        // reset al cambiar de burger
        setUniversalQtyState({});
        setSpecificSelected({});
        setRemoved({});
        setNote('');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los extras');
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, reset]);

  const setUniversalQty = useCallback((extraId: string, qty: number) => {
    setUniversalQtyState((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[extraId];
        return next;
      }
      return { ...prev, [extraId]: qty };
    });
  }, []);

  const incrementUniversal = useCallback((extra: UniversalExtra) => {
    setUniversalQtyState((prev) => {
      const current = prev[extra.id] ?? 0;
      if (current >= extra.maxQuantity) return prev;
      return { ...prev, [extra.id]: current + 1 };
    });
  }, []);

  const decrementUniversal = useCallback((extra: UniversalExtra) => {
    setUniversalQtyState((prev) => {
      const current = prev[extra.id] ?? 0;
      if (current <= 0) return prev;
      const nextValue = current - 1;
      if (nextValue === 0) {
        const copy = { ...prev };
        delete copy[extra.id];
        return copy;
      }
      return { ...prev, [extra.id]: nextValue };
    });
  }, []);

  const toggleSpecific = useCallback((extra: SpecificExtra) => {
    setSpecificSelected((prev) => ({ ...prev, [extra.id]: !prev[extra.id] }));
  }, []);

  const toggleRemoved = useCallback((ingredientId: string) => {
    setRemoved((prev) => ({ ...prev, [ingredientId]: !prev[ingredientId] }));
  }, []);

  const extrasUnitTotal = useMemo(() => {
    if (!data) return 0;
    let total = 0;
    for (const extra of data.universalExtras) {
      const qty = universalQty[extra.id] ?? 0;
      if (qty > 0) total += extra.price * qty;
    }
    for (const extra of data.specificExtras) {
      if (specificSelected[extra.id]) total += extra.price;
    }
    return total;
  }, [data, universalQty, specificSelected]);

  const toPayload = useCallback((): CustomizationPayload => {
    const universalEntries = Object.entries(universalQty)
      .filter(([, qty]) => qty > 0)
      .map(([extraId, qty]) => ({ extraId, qty }));
    const specificEntries = Object.entries(specificSelected)
      .filter(([, v]) => v)
      .map(([id]) => id);
    const removedEntries = Object.entries(removed)
      .filter(([, v]) => v)
      .map(([id]) => id);
    const trimmed = note.trim();
    return {
      universalExtras: universalEntries,
      specificExtras: specificEntries,
      removedIngredients: removedEntries,
      note: trimmed.length > 0 ? trimmed : null,
    };
  }, [universalQty, specificSelected, removed, note]);

  return {
    loading,
    error,
    data,
    universalQty,
    specificSelected,
    removed,
    note,
    extrasUnitTotal,
    setUniversalQty,
    incrementUniversal,
    decrementUniversal,
    toggleSpecific,
    toggleRemoved,
    setNote,
    reset,
    toPayload,
  };
}
