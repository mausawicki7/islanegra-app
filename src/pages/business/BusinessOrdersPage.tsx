import { OrdersTable } from '@/components/business/OrdersTable';
import type { BusinessOrder } from '@/services/businessService';

interface BusinessOrdersPageProps {
  orders: BusinessOrder[];
  loading: boolean;
  error: string | null;
}

export function BusinessOrdersPage({
  orders,
  loading,
  error,
}: BusinessOrdersPageProps) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-200">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <OrdersTable orders={orders} />
      {loading && (
        <p className="text-xs text-white/45">Actualizando datos…</p>
      )}
    </div>
  );
}
