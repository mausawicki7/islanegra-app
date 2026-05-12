import { BurgerRankingChart } from '@/components/business/BurgerRankingChart';
import { HoursHeatmap } from '@/components/business/HoursHeatmap';
import { OperationalMetrics } from '@/components/business/OperationalMetrics';
import { PaymentMethodChart } from '@/components/business/PaymentMethodChart';
import { RevenueChart } from '@/components/business/RevenueChart';
import type {
  BurgerRanking,
  HeatmapCell,
  OperationalTimings,
  PaymentSplit,
  RevenueByDay,
} from '@/services/businessService';

interface BusinessAnalyticsPageProps {
  revenueByDay: RevenueByDay[];
  burgerRanking: BurgerRanking[];
  paymentSplit: PaymentSplit[];
  heatmap: HeatmapCell[];
  operationalTimings: OperationalTimings;
  loading: boolean;
  error: string | null;
}

export function BusinessAnalyticsPage({
  revenueByDay,
  burgerRanking,
  paymentSplit,
  heatmap,
  operationalTimings,
  loading,
  error,
}: BusinessAnalyticsPageProps) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-200">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <RevenueChart data={revenueByDay} />
        <BurgerRankingChart data={burgerRanking} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <HoursHeatmap cells={heatmap} />
        <div className="space-y-5">
          <PaymentMethodChart data={paymentSplit} />
          <OperationalMetrics data={operationalTimings} />
        </div>
      </div>
      {loading && (
        <p className="text-xs text-white/45">Actualizando datos…</p>
      )}
    </div>
  );
}
