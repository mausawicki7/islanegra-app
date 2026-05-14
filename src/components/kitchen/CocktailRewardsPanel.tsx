import { useCallback, useEffect, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { COCKTAIL_PREMIO_NOMBRE } from '@/config/rewards';
import {
  fetchPendingRewards,
  findRewardByCode,
  redeemReward,
  subscribeToRewards,
  type CocktailReward,
} from '@/services/rewardsService';

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

interface CocktailRewardsPanelProps {
  onError?: (message: string) => void;
}

export function CocktailRewardsPanel({ onError }: CocktailRewardsPanelProps) {
  const [rewards, setRewards] = useState<CocktailReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchPendingRewards();
      setRewards(next);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Error al cargar cocktails');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeToRewards(() => {
      void refresh();
    });
    return unsubscribe;
  }, [refresh]);

  const redeem = async (reward: CocktailReward) => {
    const confirmed = window.confirm(
      `¿Canjear ${COCKTAIL_PREMIO_NOMBRE} para mesa ${reward.tableNumber}?`,
    );
    if (!confirmed) return;

    setBusyId(reward.id);
    setMessage(null);
    try {
      await redeemReward(reward.id);
      await refresh();
      setMessage(`Código ${reward.redemptionCode} canjeado.`);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Error al canjear premio');
    } finally {
      setBusyId(null);
    }
  };

  const validateCode = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    setMessage(null);
    try {
      const reward = await findRewardByCode(normalized);
      if (!reward) {
        setMessage('Código inexistente.');
        return;
      }
      if (reward.redeemedAt) {
        setMessage(`Código ya canjeado a las ${formatTime(reward.redeemedAt)}.`);
        return;
      }
      await redeem(reward);
      setCode('');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Error al validar código');
    }
  };

  return (
    <section className="mb-6 rounded-lg border border-white/[0.08] bg-[#111111] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
            Cocktails ganados
          </p>
          <h2 className="mt-2 text-xl font-semibold uppercase tracking-tightest text-white">
            {COCKTAIL_PREMIO_NOMBRE}
          </h2>
        </div>
        <div className="flex w-full gap-2 lg:max-w-sm">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Código"
            className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-[#050505] px-3 py-2 text-base uppercase tracking-[0.12em] text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none sm:text-sm"
          />
          <button
            type="button"
            onClick={validateCode}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-xs font-semibold uppercase tracking-[0.16em] text-black"
          >
            <Search size={15} /> Validar
          </button>
        </div>
      </div>

      {message && <p className="mt-3 text-sm text-white/64">{message}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-white/45">Cargando premios...</p>
      ) : rewards.length === 0 ? (
        <p className="mt-4 text-sm text-white/45">No hay cocktails pendientes.</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rewards.map((reward) => (
            <article
              key={reward.id}
              className="rounded-lg border border-white/[0.08] bg-[#050505] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    Mesa {reward.tableNumber} · {formatTime(reward.wonAt)}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-[0.14em] text-white">
                    {reward.redemptionCode}
                  </p>
                  <p className="mt-1 text-xs text-white/45">Score {reward.score}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId === reward.id}
                  onClick={() => void redeem(reward)}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-white/15 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  <Check size={14} /> Canjear
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
