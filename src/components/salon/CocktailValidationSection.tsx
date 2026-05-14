import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { REWARD_NAME } from '@/config/rewards';
import {
  claimReward,
  fetchPendingRewards,
  findRewardByCode,
  redeemReward,
  releaseRewardClaim,
  subscribeToRewards,
  type CocktailReward,
} from '@/services/rewardsService';

interface CocktailValidationSectionProps {
  staffName: string;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function CocktailValidationSection({
  staffName,
}: CocktailValidationSectionProps) {
  const [rewards, setRewards] = useState<CocktailReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedStaffName = staffName.trim();

  const orderedRewards = useMemo(
    () =>
      [...rewards].sort(
        (a, b) => new Date(b.wonAt).getTime() - new Date(a.wonAt).getTime(),
      ),
    [rewards],
  );

  const refresh = useCallback(async () => {
    try {
      const next = await fetchPendingRewards();
      setRewards(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar premios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeToRewards(() => {
      void refresh();
    });
    return unsubscribe;
  }, [refresh]);

  const showRedeemedMessage = () => {
    setMessage('Decile al cliente que pase por la barra.');
    window.setTimeout(() => {
      setMessage(null);
    }, 4500);
  };

  const handleClaim = async (reward: CocktailReward) => {
    setBusyId(reward.id);
    setError(null);
    try {
      await claimReward(reward.id, normalizedStaffName || null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al tomar premio');
    } finally {
      setBusyId(null);
    }
  };

  const handleRelease = async (reward: CocktailReward) => {
    setBusyId(reward.id);
    setError(null);
    try {
      await releaseRewardClaim(reward.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al soltar premio');
    } finally {
      setBusyId(null);
    }
  };

  const handleRedeem = async (reward: CocktailReward) => {
    setBusyId(reward.id);
    setError(null);
    setMessage(null);
    try {
      await redeemReward(reward.id, normalizedStaffName || undefined);
      await refresh();
      showRedeemedMessage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al canjear premio');
    } finally {
      setBusyId(null);
    }
  };

  const handleValidateCode = async () => {
    const normalized = normalizeCode(code);
    if (!normalized) return;

    setBusyId('manual');
    setError(null);
    setMessage(null);
    try {
      const reward = await findRewardByCode(normalized);
      if (!reward) {
        setError('Código inexistente.');
        return;
      }
      if (reward.redeemedAt) {
        setMessage(`Código ya canjeado a las ${formatTime(reward.redeemedAt)}.`);
        return;
      }
      await redeemReward(reward.id, normalizedStaffName || undefined);
      await refresh();
      setCode('');
      showRedeemedMessage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al validar código');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#111111] p-4">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
          Cócteles
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-white">
          Validación de {REWARD_NAME}
        </h2>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      {message && (
        <p className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/75">
          {message}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-white/45">Cargando premios...</p>
      ) : orderedRewards.length === 0 ? (
        <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#050505] px-4 py-10 text-center">
          <p className="text-sm uppercase tracking-[0.22em] text-white/45">
            Nada pendiente por ahora
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {orderedRewards.map((reward) => {
            const isOwnClaim = reward.claimedBy === normalizedStaffName;
            const isClaimedByOther = Boolean(reward.claimedBy && !isOwnClaim);
            const isBusy = busyId === reward.id;

            return (
              <article
                key={reward.id}
                className="rounded-xl border border-white/[0.08] bg-[#050505] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                      Mesa
                    </p>
                    <p className="mt-1 text-5xl font-semibold leading-none tracking-tight text-white">
                      {reward.tableNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                      Score
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                      {reward.score}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-white/[0.08] bg-[#111111] px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                    Código
                  </p>
                  <p className="mt-1 break-all text-3xl font-semibold tracking-[0.2em] text-white">
                    {reward.redemptionCode}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
                  <span>Ganado a las {formatTime(reward.wonAt)}</span>
                  {isClaimedByOther && (
                    <span className="text-white/65">Lo tomó {reward.claimedBy}</span>
                  )}
                  {isOwnClaim && (
                    <span className="text-white/65">Lo tomaste vos</span>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  {!reward.claimedBy && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleClaim(reward)}
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-white/15 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/10 disabled:opacity-50"
                    >
                      Voy yo
                    </button>
                  )}

                  {(isOwnClaim || isClaimedByOther) && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleRedeem(reward)}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 text-xs font-semibold uppercase tracking-[0.16em] text-black transition disabled:opacity-50"
                    >
                      <Check size={15} /> Canjear
                    </button>
                  )}

                  {isOwnClaim && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleRelease(reward)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10 disabled:opacity-50"
                      aria-label="Soltar premio"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-6 border-t border-white/[0.08] pt-4">
        <label
          htmlFor="cocktail-code"
          className="text-[11px] uppercase tracking-[0.22em] text-white/45"
        >
          Validar código manual
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="cocktail-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleValidateCode();
            }}
            placeholder="Código"
            className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-[#050505] px-3 py-3 text-base uppercase tracking-[0.16em] text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
          />
          <button
            type="button"
            disabled={busyId === 'manual'}
            onClick={() => void handleValidateCode()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-4 text-xs font-semibold uppercase tracking-[0.16em] text-black transition disabled:opacity-50"
          >
            <Search size={15} /> Validar
          </button>
        </div>
      </div>
    </section>
  );
}
