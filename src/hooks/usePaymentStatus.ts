import { useEffect, useState } from 'react';
import { getPaymentStatus } from '@/services/mercadoPagoService';
import { subscribeToPaymentStatus } from '@/services/paymentsService';
import type { PaymentStatusSnapshot } from '@/types/payment';

export function usePaymentStatus(orderId: string | undefined) {
  const [snapshot, setSnapshot] = useState<PaymentStatusSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let alive = true;

    const refresh = async () => {
      try {
        const next = await getPaymentStatus(orderId);
        if (!alive) return;
        setSnapshot(next);
        setError(next ? null : 'No encontramos el estado del pago');
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Error al consultar pago');
      } finally {
        if (alive) setLoading(false);
      }
    };

    void refresh();
    const unsubscribe = subscribeToPaymentStatus(orderId, setSnapshot);
    const poll = window.setInterval(() => {
      void refresh();
    }, 5_000);

    return () => {
      alive = false;
      unsubscribe();
      window.clearInterval(poll);
    };
  }, [orderId]);

  return {
    snapshot,
    paymentStatus: snapshot?.paymentStatus ?? null,
    isConfirmed: snapshot?.paymentStatus === 'paid',
    loading,
    error,
  };
}
