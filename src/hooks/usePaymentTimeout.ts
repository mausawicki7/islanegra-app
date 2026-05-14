import { useEffect, useMemo, useState } from 'react';
import { PAYMENT_TIMEOUT_MINUTES } from '@/config/pricing';

export function usePaymentTimeout(createdAt: string | undefined) {
  const expiresAt = useMemo(() => {
    if (!createdAt) return null;
    return new Date(createdAt).getTime() + PAYMENT_TIMEOUT_MINUTES * 60_000;
  }, [createdAt]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const secondsLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - now) / 1000))
    : PAYMENT_TIMEOUT_MINUTES * 60;

  return {
    secondsLeft,
    isExpired: secondsLeft <= 0,
  };
}
