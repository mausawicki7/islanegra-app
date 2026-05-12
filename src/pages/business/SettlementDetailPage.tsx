import { Navigate, useParams } from 'react-router-dom';
import { SettlementDetail } from '@/components/business/settlements/SettlementDetail';
import { useSettlement } from '@/hooks/useSettlements';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatMonthLabel } from '@/utils/monthHelpers';
import type { UserRole } from '@/services/authService';

interface SettlementDetailPageProps {
  role: UserRole;
}

const monthRe = /^\d{4}-\d{2}$/;

export function SettlementDetailPage({ role }: SettlementDetailPageProps) {
  const { month } = useParams<{ month: string }>();

  if (!month || !monthRe.test(month)) {
    return <Navigate to="/negocio/liquidaciones" replace />;
  }

  const monthIso = `${month}-01`;
  const { settlement, loading, error, refresh } = useSettlement(monthIso);
  usePageTitle(`Liquidación ${formatMonthLabel(monthIso)} · Negocio`);

  if (loading) {
    return <p className="text-sm text-white/45">Cargando liquidación…</p>;
  }
  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200">
        {error}
      </p>
    );
  }
  if (!settlement) {
    return <Navigate to="/negocio/liquidaciones" replace />;
  }

  return <SettlementDetail settlement={settlement} role={role} onRefresh={refresh} />;
}
