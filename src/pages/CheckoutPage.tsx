import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import logo from '@/assets/logo.svg';
import { Footer } from '@/components/layout/Footer';
import { CashPaymentWaiting } from '@/components/order/CashPaymentWaiting';
import { MercadoPagoBrick } from '@/components/order/MercadoPagoBrick';
import { PaymentTimeout } from '@/components/order/PaymentTimeout';
import { TRACKING_STORAGE_KEY } from '@/data/copy';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { usePaymentTimeout } from '@/hooks/usePaymentTimeout';
import { fetchOrderById } from '@/services/ordersService';
import { cancelUnpaidOrder } from '@/services/paymentsService';
import type { Order } from '@/types/order';

export function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const { isConfirmed } = usePaymentStatus(orderId);
  const { secondsLeft, isExpired } = usePaymentTimeout(order?.createdAt);

  usePageTitle(order ? `Pagar pedido ${order.orderNumber}` : 'Checkout');

  useEffect(() => {
    if (!orderId) return;
    let alive = true;
    setLoading(true);
    fetchOrderById(orderId)
      .then((next) => {
        if (!alive) return;
        setOrder(next);
        setError(next ? null : 'No encontramos ese pedido');
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Error al cargar checkout');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !isConfirmed) return;
    localStorage.setItem(TRACKING_STORAGE_KEY, orderId);
    navigate(`/pedido/${orderId}`, { replace: true });
  }, [isConfirmed, navigate, orderId]);

  useEffect(() => {
    if (!orderId || !isExpired || isConfirmed || timedOut) return;
    void cancelUnpaidOrder(orderId, 'payment_timeout').finally(() => {
      setTimedOut(true);
    });
  }, [isConfirmed, isExpired, orderId, timedOut]);

  if (!orderId) {
    return <Navigate to="/menu" replace />;
  }

  const retry = () => {
    const table = order?.tableNumber ? `?mesa=${order.tableNumber}` : '';
    navigate(`/menu${table}`, { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col bg-[#050505] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#050505]/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4 sm:px-5">
          <Link to="/menu" aria-label="Islanegra - ir al menu">
            <img src={logo} alt="Islanegra" className="h-3.5 w-auto sm:h-4" />
          </Link>
          <span className="text-[11px] uppercase tracking-[0.22em] text-white/45">
            Checkout
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-12 pt-6 sm:px-5">
        {loading && <p className="text-sm text-white/45">Cargando pago...</p>}
        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}
        {order && timedOut && <PaymentTimeout onRetry={retry} />}
        {order && !timedOut && order.paymentMethod === 'cash' && (
          <CashPaymentWaiting
            order={order}
            secondsLeft={secondsLeft}
            onTimeout={() => setTimedOut(true)}
            onCancel={retry}
          />
        )}
        {order && !timedOut && order.paymentMethod === 'mercadopago' && (
          <MercadoPagoBrick
            order={order}
            secondsLeft={secondsLeft}
            onBack={retry}
          />
        )}
      </main>

      <div className="mx-auto w-full max-w-xl px-4 sm:px-5">
        <Footer />
      </div>
    </div>
  );
}
