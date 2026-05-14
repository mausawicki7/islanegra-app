import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Wifi, WifiOff } from 'lucide-react';
import logo from '@/assets/logo.svg';
import { Footer } from '@/components/layout/Footer';
import { FlappyBurger } from '@/components/game/FlappyBurger';
import { OrderDetailAccordion } from '@/components/tracking/OrderDetailAccordion';
import { OrderStepper } from '@/components/tracking/OrderStepper';
import { ReadyNotification } from '@/components/tracking/ReadyNotification';
import { RewardCodeDisplay } from '@/components/tracking/RewardCodeDisplay';
import { StatusMessage } from '@/components/tracking/StatusMessage';
import { TRACKING_STORAGE_KEY } from '@/data/copy';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { usePageTitle } from '@/hooks/usePageTitle';
import { fetchRewardForOrder, type CocktailReward } from '@/services/rewardsService';

export function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const fallbackOrderId =
    typeof window !== 'undefined' ? localStorage.getItem(TRACKING_STORAGE_KEY) : null;
  const resolvedOrderId = orderId ?? fallbackOrderId ?? undefined;
  const { order, loading, error, connection } = useOrderRealtime(resolvedOrderId);
  const [reward, setReward] = useState<CocktailReward | null>(null);

  usePageTitle(order ? `Pedido ${order.orderNumber}` : 'Pedido');

  useEffect(() => {
    if (!orderId && fallbackOrderId) {
      navigate(`/pedido/${fallbackOrderId}`, { replace: true });
    }
  }, [fallbackOrderId, navigate, orderId]);

  const refreshReward = useCallback(async () => {
    if (!resolvedOrderId) return;
    try {
      const next = await fetchRewardForOrder(resolvedOrderId);
      setReward(next);
    } catch {
      setReward(null);
    }
  }, [resolvedOrderId]);

  useEffect(() => {
    void refreshReward();
  }, [order?.status, refreshReward]);

  if (!resolvedOrderId) {
    return <Navigate to="/menu" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#050505] px-4 text-white">
        <p className="text-sm text-white/45">Cargando pedido...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-full flex-col bg-[#050505] text-white">
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 text-center">
          <p className="text-sm text-white/45">{error ?? 'No encontramos ese pedido.'}</p>
          <Link
            to="/menu"
            className="mx-auto mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-xs font-semibold uppercase tracking-[0.18em] text-black"
          >
            Ir al menú
          </Link>
        </main>
      </div>
    );
  }

  const showGame = order.status === 'new' || order.status === 'preparing';
  const showReady = order.status === 'ready';
  const rewardCode = reward?.redemptionCode ?? null;

  return (
    <div className="flex min-h-full flex-col bg-[#050505] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#050505]/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 sm:px-5">
          <Link to="/menu" aria-label="Islanegra — ir al menú">
            <img src={logo} alt="Islanegra" className="h-3.5 w-auto sm:h-4" />
          </Link>
          <div className="min-w-0 text-right">
            <p className="truncate text-[11px] uppercase tracking-[0.22em] text-white">
              #{order.orderNumber} · Mesa {order.tableNumber}
            </p>
            <p className="mt-0.5 inline-flex items-center justify-end gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/45">
              {connection === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connection === 'connected' ? 'En vivo' : 'Reconectando'}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 px-4 pb-12 pt-6 sm:px-5 sm:pt-8">
        <OrderStepper status={order.status} />
        <StatusMessage status={order.status} />
        <OrderDetailAccordion order={order} />

        {showGame && (
          <FlappyBurger
            orderId={order.id}
            tableNumber={Number(order.tableNumber)}
            onReward={() => {
              void refreshReward();
            }}
          />
        )}

        {showReady && <ReadyNotification />}

        {rewardCode && (
          <RewardCodeDisplay code={rewardCode} redeemedAt={reward?.redeemedAt} />
        )}

        {order.status === 'delivered' && (
          <section className="rounded-lg border border-white/[0.08] bg-[#111111] p-5 text-center">
            <p className="text-sm leading-6 text-white/64">
              Rating viene en la próxima versión. Por ahora, gracias por comer con nosotros.
            </p>
            <Link
              to={`/menu?mesa=${order.tableNumber}`}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-xs font-semibold uppercase tracking-[0.18em] text-black"
            >
              Pedir otra
            </Link>
          </section>
        )}
      </main>

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-5">
        <Footer />
      </div>
    </div>
  );
}
