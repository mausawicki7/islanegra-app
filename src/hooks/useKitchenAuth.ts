import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'islanegra:kitchenAuth';
const EXPECTED_PIN = import.meta.env.VITE_KITCHEN_PIN ?? '';

export function useKitchenAuth() {
  const [authorized, setAuthorized] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  });

  useEffect(() => {
    if (!EXPECTED_PIN) {
      // No PIN configured — leave the kitchen open in dev, but warn.
      // eslint-disable-next-line no-console
      console.warn(
        '[kitchen] VITE_KITCHEN_PIN no está configurado. /cocina queda abierta.',
      );
      setAuthorized(true);
    }
  }, []);

  const attempt = useCallback((pin: string): boolean => {
    if (!EXPECTED_PIN) {
      setAuthorized(true);
      return true;
    }
    if (pin === EXPECTED_PIN) {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
      setAuthorized(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setAuthorized(false);
  }, []);

  return { authorized, attempt, logout, pinConfigured: Boolean(EXPECTED_PIN) };
}
