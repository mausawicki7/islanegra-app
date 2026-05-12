import { PartnersList } from '@/components/business/partners/PartnersList';
import { usePartners } from '@/hooks/usePartners';
import { usePageTitle } from '@/hooks/usePageTitle';

export function PartnersPage() {
  const { partners, loading, error, refresh } = usePartners();
  usePageTitle('Socios · Negocio');

  if (loading) {
    return <p className="text-sm text-white/45">Cargando socios…</p>;
  }
  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200">
        {error}
      </p>
    );
  }

  return <PartnersList partners={partners} onRefresh={refresh} />;
}
