import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  computeBurgerRanking,
  computeHeatmap,
  computeKpis,
  computeOperationalTimings,
  computePaymentSplit,
  computeRevenueByDay,
  fetchOrdersInRange,
  realtimeOrdersChannel,
  type BusinessOrder,
} from '@/services/businessService';
import {
  bucketDays,
  previousPeriod,
  type PeriodRange,
} from '@/utils/periodHelpers';

interface UseBusinessMetricsResult {
  loading: boolean;
  error: string | null;
  orders: BusinessOrder[];
  previousOrders: BusinessOrder[];
  kpis: ReturnType<typeof computeKpis>;
  previousKpis: ReturnType<typeof computeKpis>;
  revenueByDay: ReturnType<typeof computeRevenueByDay>;
  burgerRanking: ReturnType<typeof computeBurgerRanking>;
  paymentSplit: ReturnType<typeof computePaymentSplit>;
  heatmap: ReturnType<typeof computeHeatmap>;
  operationalTimings: ReturnType<typeof computeOperationalTimings>;
  refresh: () => Promise<void>;
}

/**
 * Centralised fetch+derive pipeline. Subscribes to realtime order events so
 * the dashboard updates instantly when a new order lands or transitions.
 */
export function useBusinessMetrics(period: PeriodRange): UseBusinessMetricsResult {
  const [orders, setOrders] = useState<BusinessOrder[]>([]);
  const [previousOrders, setPreviousOrders] = useState<BusinessOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const periodRef = useRef(period);
  periodRef.current = period;

  const refresh = useCallback(async () => {
    const p = periodRef.current;
    const prev = previousPeriod(p);
    try {
      const [now, before] = await Promise.all([
        fetchOrdersInRange(p.start, p.end),
        fetchOrdersInRange(prev.start, prev.end),
      ]);
      setOrders(now);
      setPreviousOrders(before);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando métricas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [period.start, period.end, refresh]);

  useEffect(() => {
    const unsubscribe = realtimeOrdersChannel(() => {
      void refresh();
    });
    return () => unsubscribe();
  }, [refresh]);

  const buckets = useMemo(() => bucketDays(period), [period.start, period.end]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = useMemo(() => computeKpis(orders), [orders]);
  const previousKpis = useMemo(() => computeKpis(previousOrders), [previousOrders]);
  const revenueByDay = useMemo(
    () => computeRevenueByDay(orders, buckets),
    [orders, buckets],
  );
  const burgerRanking = useMemo(() => computeBurgerRanking(orders), [orders]);
  const paymentSplit = useMemo(() => computePaymentSplit(orders), [orders]);
  const heatmap = useMemo(() => computeHeatmap(orders), [orders]);
  const operationalTimings = useMemo(
    () => computeOperationalTimings(orders),
    [orders],
  );

  return {
    loading,
    error,
    orders,
    previousOrders,
    kpis,
    previousKpis,
    revenueByDay,
    burgerRanking,
    paymentSplit,
    heatmap,
    operationalTimings,
    refresh,
  };
}
