import { Check } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TRACKING_STORAGE_KEY } from '@/data/copy';
import type { Order } from '@/types/order';
import { formatPrice } from '@/utils/formatPrice';

interface OrderConfirmationProps {
  order: Order;
  onClose: () => void;
}

export function OrderConfirmation({ order, onClose }: OrderConfirmationProps) {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(TRACKING_STORAGE_KEY, order.id);
    const timer = window.setTimeout(() => {
      navigate(`/pedido/${order.id}`);
    }, 2_000);
    return () => window.clearTimeout(timer);
  }, [navigate, order.id]);

  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/5">
        <Check size={26} className="text-white" strokeWidth={1.5} />
      </div>

      <p className="mt-6 text-[11px] uppercase tracking-[0.32em] text-white/45">
        Pedido recibido
      </p>
      <h2 className="mt-3 text-balance font-semibold uppercase tracking-tightest text-white text-3xl leading-[0.95]">
        #{order.orderNumber}
      </h2>

      <dl className="mt-8 grid w-full max-w-xs grid-cols-2 gap-y-3 text-sm">
        <dt className="text-left text-white/45">Mesa</dt>
        <dd className="text-right text-white tabular-nums">
          {order.tableNumber}
        </dd>
        <dt className="text-left text-white/45">Estado</dt>
        <dd className="text-right text-white">Recibido</dd>
        <dt className="text-left text-white/45">Pago</dt>
        <dd className="text-right text-white">
          {order.paymentMethod === 'cash' ? 'Efectivo' : 'MercadoPago'}
        </dd>
        <dt className="text-left text-white/45">Total</dt>
        <dd className="text-right text-white tabular-nums">
          {formatPrice(order.totalAmount)}
        </dd>
      </dl>

      <button
        type="button"
        onClick={() => {
          onClose();
          navigate(`/pedido/${order.id}`);
        }}
        className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-white/90"
      >
        Ver seguimiento
      </button>
    </div>
  );
}
