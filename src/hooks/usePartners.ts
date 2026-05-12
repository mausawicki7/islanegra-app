import { useCallback, useEffect, useState } from 'react';
import { fetchPartners } from '@/services/partnersService';
import type { Partner } from '@/types/settlement';

interface UsePartnersResult {
  partners: Partner[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePartners(): UsePartnersResult {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchPartners();
      setPartners(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando socios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { partners, loading, error, refresh };
}
