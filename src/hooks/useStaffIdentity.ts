import { useCallback, useEffect, useState } from 'react';
import type { StaffIdentity } from '@/types/salon';

export const SALON_STAFF_STORAGE_KEY = 'salonStaffName';

function readStoredName(): string | null {
  try {
    const value = window.localStorage.getItem(SALON_STAFF_STORAGE_KEY)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

export function useStaffIdentity() {
  const [identity, setIdentity] = useState<StaffIdentity | null>(() => {
    const name = readStoredName();
    return name ? { name } : null;
  });

  useEffect(() => {
    const name = readStoredName();
    setIdentity(name ? { name } : null);
  }, []);

  const saveIdentity = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    window.localStorage.setItem(SALON_STAFF_STORAGE_KEY, trimmed);
    setIdentity({ name: trimmed });
  }, []);

  const clearIdentity = useCallback(() => {
    window.localStorage.removeItem(SALON_STAFF_STORAGE_KEY);
    setIdentity(null);
  }, []);

  return { identity, saveIdentity, clearIdentity };
}
