import { ClaimableTaskCard } from './ClaimableTaskCard';
import type { SalonOrder } from '@/types/salon';

interface ReadyOrdersSectionProps {
  orders: SalonOrder[];
  staffName: string;
  loading: boolean;
  onSettled: () => void;
}

export function ReadyOrdersSection({
  orders,
  staffName,
  loading,
  onSettled,
}: ReadyOrdersSectionProps) {
  if (loading) {
    return <p className="pt-4 text-sm text-white/45">Cargando pedidos listos…</p>;
  }

  if (orders.length === 0) {
    return (
      <section className="rounded-2xl border border-white/[0.08] bg-[#111111] px-4 py-10 text-center">
        <p className="text-sm uppercase tracking-[0.22em] text-white/45">
          Nada pendiente por ahora
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {orders.map((order) => (
        <ClaimableTaskCard
          key={order.id}
          order={order}
          staffName={staffName}
          onSettled={onSettled}
        />
      ))}
    </section>
  );
}
