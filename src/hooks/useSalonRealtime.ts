import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchReadyOrders, subscribeToSalonOrders } from '@/services/salonService';
import type { SalonConnectionState, SalonOrder } from '@/types/salon';

export function useSalonRealtime() {
  const [readyOrders, setReadyOrders] = useState<SalonOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<SalonConnectionState>('reconnecting');
  const seenReadyIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    try {
      const orders = await fetchReadyOrders();
      setReadyOrders(orders);
      setError(null);

      const nextIds = new Set(orders.map((order) => order.id));
      if (!initialized.current) {
        seenReadyIds.current = nextIds;
        initialized.current = true;
      } else {
        for (const order of orders) {
          if (!seenReadyIds.current.has(order.id)) {
            navigator.vibrate?.([80, 40, 80]);
          }
        }
        seenReadyIds.current = nextIds;
      }
      setConnection('connected');
    } catch (err) {
      setConnection('reconnecting');
      setError(err instanceof Error ? err.message : 'Error al cargar salón');
    } finally {
      setLoading(false);
    }
  }, []);

  const subscribe = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = subscribeToSalonOrders({
      onChange: refresh,
      onReady: (orderId) => {
        if (initialized.current && !seenReadyIds.current.has(orderId)) {
          navigator.vibrate?.([80, 40, 80]);
        }
      },
      onStatus: setConnection,
    });
  }, [refresh]);

  useEffect(() => {
    setLoading(true);
    void refresh();
    subscribe();

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      setConnection('reconnecting');
      void refresh();
      subscribe();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [refresh, subscribe]);

  return { readyOrders, loading, error, connection, refresh };
}
