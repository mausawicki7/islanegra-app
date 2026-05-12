import { SettlementsList } from '@/components/business/settlements/SettlementsList';
import { useSettlementsList } from '@/hooks/useSettlements';
import { usePageTitle } from '@/hooks/usePageTitle';

export function SettlementsPage() {
  const { months, loading, error } = useSettlementsList();
  usePageTitle('Liquidaciones · Negocio');

  return (
    <section className="space-y-5">
      <header>
        <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">
          Negocio
        </p>
        <h1 className="mt-2 text-balance font-semibold uppercase tracking-tightest text-white text-3xl leading-[0.95]">
          Liquidaciones
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/55">
          Cálculo mensual sobre <span className="text-white/80">pedidos cobrados</span>. Mauricio y Sebastián reciben el porcentaje configurado en{' '}
          <span className="text-white/80">Socios</span>. Los meses confirmados quedan inmutables.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-white/45">Cargando liquidaciones…</p>
      ) : (
        <SettlementsList months={months} />
      )}
    </section>
  );
}
