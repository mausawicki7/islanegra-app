import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Order } from '@/types/order';
import { formatPrice } from '@/utils/formatPrice';

interface OrderDetailAccordionProps {
  order: Order;
}

export function OrderDetailAccordion({ order }: OrderDetailAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border border-white/[0.08] bg-[#111111]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white">
          Detalle del pedido
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-white/55 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-white/[0.08] px-4 py-4">
          <ul className="space-y-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0 text-white/70">
                  {item.quantity} x {item.productName}
                </span>
                <span className="shrink-0 tabular-nums text-white">
                  {formatPrice(item.subtotal)}
                </span>
              </li>
            ))}
          </ul>
          {order.note && (
            <p className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/64">
              {order.note}
            </p>
          )}
          <dl className="mt-5 space-y-2 border-t border-white/[0.08] pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/45">Pago</dt>
              <dd className="text-white">
                {order.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/45">Total</dt>
              <dd className="tabular-nums text-white">{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
