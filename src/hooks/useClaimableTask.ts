import { useMemo, useState } from 'react';
import { claimTask, completeTask } from '@/services/salonService';
import type { ClaimableTask } from '@/types/salon';

export type ClaimState = 'unclaimed' | 'claimed-by-me' | 'claimed-by-other';

export function useClaimableTask(task: ClaimableTask, staffName: string, onSettled: () => void) {
  const [busy, setBusy] = useState(false);
  const [optimisticClaim, setOptimisticClaim] = useState<string | null | undefined>();
  const [error, setError] = useState<string | null>(null);

  const claimedBy = optimisticClaim !== undefined ? optimisticClaim : task.claimedBy;

  const claimState = useMemo<ClaimState>(() => {
    if (!claimedBy) return 'unclaimed';
    return claimedBy.trim().toLowerCase() === staffName.trim().toLowerCase()
      ? 'claimed-by-me'
      : 'claimed-by-other';
  }, [claimedBy, staffName]);

  const runAction = async (action: () => Promise<void>, nextClaim: string | null | undefined) => {
    setBusy(true);
    setError(null);
    setOptimisticClaim(nextClaim);
    try {
      await action();
      await onSettled();
    } catch (err) {
      setOptimisticClaim(undefined);
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la tarea');
    } finally {
      setBusy(false);
    }
  };

  const claim = () => runAction(() => claimTask(task.id, staffName), staffName);
  const release = () => runAction(() => claimTask(task.id, null), null);
  const complete = () => runAction(() => completeTask(task.id), null);

  return {
    busy,
    error,
    claimedBy,
    claimState,
    claim,
    release,
    complete,
  };
}
