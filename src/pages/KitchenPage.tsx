import { useCallback, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { CocktailRewardsPanel } from '@/components/kitchen/CocktailRewardsPanel';
import { KitchenAuth } from '@/components/kitchen/KitchenAuth';
import { KitchenGrid } from '@/components/kitchen/KitchenGrid';
import { PendingCashPayments } from '@/components/kitchen/PendingCashPayments';
import logo from '@/assets/logo.svg';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  advanceOrderStatus,
  cancelOrder,
} from '@/services/kitchenService';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { useActiveOrders } from '@/hooks/useActiveOrders';
import { useKitchenAuth } from '@/hooks/useKitchenAuth';
import type { Order } from '@/types/order';
import { playNewOrderChime } from '@/utils/sound';

export function KitchenPage() {
  const { authorized, attempt, logout } = useKitchenAuth();

  usePageTitle('Cocina');

  const handleNewOrder = useCallback(() => {
    playNewOrderChime();
  }, []);

  const { orders, loading, error, refresh } = useActiveOrders({
    onNewOrder: authorized ? handleNewOrder : undefined,
  });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!authorized) {
    return <KitchenAuth onSubmit={attempt} />;
  }

  const handleAdvance = async (order: Order) => {
    setBusyId(order.id);
    setActionError(null);
    try {
      await advanceOrderStatus(order.id, order.status);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al avanzar pedido');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (order: Order) => {
    const confirmed = window.confirm(
      `¿Cancelar pedido #${order.orderNumber} (mesa ${order.tableNumber})?`,
    );
    if (!confirmed) return;
    setBusyId(order.id);
    setActionError(null);
    try {
      await cancelOrder(order.id);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al cancelar');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-ink-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[120rem] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Islanegra" className="h-4 w-auto" />
            <span className="hidden text-[11px] uppercase tracking-[0.32em] text-white/45 sm:inline">
              Cocina
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] uppercase tracking-[0.22em] text-white/55 tabular-nums">
              {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
            </span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-white/55 transition hover:text-white"
              aria-label="Cerrar sesión cocina"
            >
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[120rem] flex-1 px-4 sm:px-6 pb-12 pt-6">
        {!isSupabaseConfigured && (
          <p className="mb-4 rounded-xl border border-amber-300/30 bg-amber-300/[0.05] px-3 py-2 text-xs text-amber-200">
            Supabase no está configurado. Revisá las VITE_SUPABASE_* en
            `.env.local`.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200"
          >
            {error}
          </p>
        )}
        {actionError && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200"
          >
            {actionError}
          </p>
        )}
        <CocktailRewardsPanel onError={setActionError} />
        <PendingCashPayments
          onConfirmed={refresh}
          onError={setActionError}
        />
        {loading ? (
          <p className="text-sm text-white/45">Cargando pedidos…</p>
        ) : (
          <KitchenGrid
            orders={orders}
            busyId={busyId}
            onAdvance={handleAdvance}
            onCancel={handleCancel}
          />
        )}
      </main>

      <div className="mx-auto w-full max-w-[120rem] px-4 sm:px-6">
        <Footer />
      </div>
    </div>
  );
}
