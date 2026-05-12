import type { Order } from '@/types/order';
import { KitchenOrderCard } from './KitchenOrderCard';

interface KitchenGridProps {
  orders: Order[];
  busyId: string | null;
  onAdvance: (order: Order) => void;
  onCancel: (order: Order) => void;
}

export function KitchenGrid({
  orders,
  busyId,
  onAdvance,
  onCancel,
}: KitchenGridProps) {
  if (orders.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <p className="text-[11px] uppercase tracking-[0.32em] text-white/35">
          Sin pedidos
        </p>
        <p className="mt-3 text-xl text-white/45">Cocina en pausa.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {orders.map((order) => (
        <KitchenOrderCard
          key={order.id}
          order={order}
          busy={busyId === order.id}
          onAdvance={onAdvance}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}
