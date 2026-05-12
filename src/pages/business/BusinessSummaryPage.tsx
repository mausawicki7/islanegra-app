import { KPICard } from '@/components/business/KPICard';
import { pctDelta, type KpiSummary } from '@/services/businessService';
import { formatPrice } from '@/utils/formatPrice';

interface BusinessSummaryPageProps {
  kpis: KpiSummary;
  previousKpis: KpiSummary;
  loading: boolean;
  error: string | null;
}

export function BusinessSummaryPage({
  kpis,
  previousKpis,
  loading,
  error,
}: BusinessSummaryPageProps) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-200">
        {error}
      </p>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KPICard
          label="Ingresos cobrados"
          value={formatPrice(kpis.revenue)}
          subtitle="Solo pedidos cobrados (delivered)"
          delta={pctDelta(kpis.revenue, previousKpis.revenue)}
        />
        <KPICard
          label="Pedidos cobrados"
          value={String(kpis.delivered)}
          subtitle="Cantidad en el período"
          delta={pctDelta(kpis.delivered, previousKpis.delivered)}
        />
        <KPICard
          label="Ticket promedio"
          value={formatPrice(Math.round(kpis.averageTicket))}
          subtitle="Ingresos / pedidos cobrados"
          delta={pctDelta(kpis.averageTicket, previousKpis.averageTicket)}
        />
        <KPICard
          label="Burger más vendida"
          value={kpis.topBurger?.name ?? '—'}
          subtitle={
            kpis.topBurger
              ? `${kpis.topBurger.units} u vendida${kpis.topBurger.units === 1 ? '' : 's'}`
              : 'Sin ventas en el período'
          }
          delta={null}
          hint="Top por unidades"
        />
      </div>
      {loading && (
        <p className="text-xs text-white/45">Actualizando datos…</p>
      )}
    </section>
  );
}
