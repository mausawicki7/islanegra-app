import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchActiveOrders, subscribeToOrders } from '@/services/kitchenService';
import type { Order } from '@/types/order';

interface UseActiveOrdersResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseActiveOrdersOptions {
  onNewOrder?: () => void;
}

export function useActiveOrders(
  options: UseActiveOrdersOptions = {},
): UseActiveOrdersResult {
  const { onNewOrder } = options;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const onNewOrderRef = useRef(onNewOrder);
  onNewOrderRef.current = onNewOrder;

  const refresh = useCallback(async () => {
    try {
      const list = await fetchActiveOrders();
      setOrders(list);
      // Track which IDs we already knew about so we don't re-trigger sound
      // for orders that simply transitioned state.
      const next = new Set(list.map((o) => o.id));
      seenIdsRef.current = next;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const unsubscribe = subscribeToOrders({
      onInsert: (id) => {
        if (!seenIdsRef.current.has(id)) {
          onNewOrderRef.current?.();
        }
      },
      onChange: () => {
        void refresh();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [refresh]);

  return { orders, loading, error, refresh };
}
