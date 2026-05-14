import { useState } from 'react';
import { GAME_COPY } from '@/data/copy';

interface GameOverScreenProps {
  score: number;
  weeklyHighScore: number;
  rewardCode: string | null;
  message: string | null;
  onNameSubmit?: (name: string) => Promise<void>;
  onRetry: () => void;
  onClose: () => void;
}

export function GameOverScreen({
  score,
  weeklyHighScore,
  rewardCode,
  message,
  onNameSubmit,
  onRetry,
  onClose,
}: GameOverScreenProps) {
  const behind = Math.max(weeklyHighScore - score + 1, 0);
  const [name, setName] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim() || !onNameSubmit) return;
    setSaving(true);
    try {
      await onNameSubmit(name.trim());
      setNameSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-x-4 top-2 bottom-2 z-10 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#111111]/95 p-5 text-center backdrop-blur">
      {rewardCode && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
          {Array.from({ length: 16 }, (_, index) => (
            <span
              key={index}
              className="confetti-bit"
              style={{
                left: `${(index * 17) % 100}%`,
                animationDelay: `${index * 0.08}s`,
              }}
            />
          ))}
        </div>
      )}
      <p className="relative text-[11px] uppercase tracking-[0.28em] text-white/45">
        Score
      </p>
      <p className="relative mt-2 text-5xl font-semibold tabular-nums text-white">{score}</p>
      <p className="relative mx-auto mt-3 max-w-xs text-sm leading-6 text-white/64">
        {message ?? (rewardCode ? GAME_COPY.gameOverWinning : GAME_COPY.gameOverBehind(behind))}
      </p>
      {rewardCode && (
        <>
          <p className="relative mt-4 rounded-lg bg-white px-4 py-3 text-2xl font-semibold tracking-[0.16em] text-black">
            {rewardCode}
          </p>
          <div className="relative mt-4">
            {nameSaved ? (
              <p className="text-sm text-white/64">
                ✓ Aparecés en el ranking como <span className="font-semibold text-white">{name}</span>
              </p>
            ) : (
              <>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">
                  ¿Cómo querés aparecer en el ranking?
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveName(); }}
                    placeholder="Tu nombre"
                    maxLength={24}
                    className="h-10 flex-1 rounded-lg border border-white/15 bg-white/[0.06] px-3 text-base text-white placeholder-white/30 focus:border-white/30 focus:outline-none sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveName()}
                    disabled={!name.trim() || saving}
                    className="h-10 rounded-lg bg-white px-4 text-xs font-semibold uppercase tracking-[0.16em] text-black disabled:opacity-40"
                  >
                    {saving ? '...' : 'Guardar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
      <div className="relative mt-5 flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="h-11 flex-1 rounded-full bg-white px-4 text-xs font-semibold uppercase tracking-[0.18em] text-black"
        >
          Otra vez
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-11 flex-1 rounded-full border border-white/15 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
