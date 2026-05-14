import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchOrderById, subscribeToOrder } from '@/services/ordersService';
import { TRACKING_STORAGE_KEY } from '@/data/copy';
import type { Order } from '@/types/order';

type ConnectionState = 'connected' | 'reconnecting';

export function useOrderRealtime(orderId: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('reconnecting');
  const connectionRef = useRef<ConnectionState>('reconnecting');

  const updateConnection = useCallback((next: ConnectionState) => {
    connectionRef.current = next;
    setConnection(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    try {
      const next = await fetchOrderById(orderId);
      setOrder(next);
      setError(next ? null : 'No encontramos ese pedido');
      if (next && next.status !== 'delivered' && next.status !== 'cancelled') {
        localStorage.setItem(TRACKING_STORAGE_KEY, next.id);
      }
      if (next?.status === 'delivered' || next?.status === 'cancelled') {
        localStorage.removeItem(TRACKING_STORAGE_KEY);
      }
    } catch (err) {
      updateConnection('reconnecting');
      setError(err instanceof Error ? err.message : 'Error al cargar pedido');
    } finally {
      setLoading(false);
    }
  }, [orderId, updateConnection]);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void refresh();

    const unsubscribe = subscribeToOrder(orderId, refresh, updateConnection);
    const poll = window.setInterval(() => {
      if (connectionRef.current === 'reconnecting') {
        void refresh();
      }
    }, 10_000);

    return () => {
      unsubscribe();
      window.clearInterval(poll);
    };
  }, [orderId, refresh, updateConnection]);

  return { order, loading, error, connection, refresh };
}
