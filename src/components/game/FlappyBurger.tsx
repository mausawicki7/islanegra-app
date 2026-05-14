import { useState } from 'react';
import { GAME_COPY } from '@/data/copy';
import { useWeeklyHighScore } from '@/hooks/useWeeklyHighScore';
import { insertGameScore, updatePlayerName } from '@/services/gameScoresService';
import { createRewardScore } from '@/services/rewardsService';
import { GameCanvas } from './GameCanvas';
import { GameOverScreen } from './GameOverScreen';
import { WeeklyLeaderboard } from './WeeklyLeaderboard';

interface FlappyBurgerProps {
  orderId: string;
  tableNumber: number;
  onReward: (code: string) => void;
}

export function FlappyBurger({ orderId, tableNumber, onReward }: FlappyBurgerProps) {
  const {
    weeklyHighScore,
    allTimeHighScore,
    leaderboard,
    loading,
    error,
    refresh,
  } = useWeeklyHighScore();
  const [resetToken, setResetToken] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [rewardCode, setRewardCode] = useState<string | null>(null);
  const [rewardScoreId, setRewardScoreId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const handleGameOver = async (score: number) => {
    setLastScore(score);
    setGameOver(true);
    setRewardCode(null);
    setRewardScoreId(null);
    setMessage(null);

    const brokeRecord = score > weeklyHighScore && score > 0;
    try {
      if (brokeRecord) {
        try {
          const reward = await createRewardScore({ orderId, tableNumber, score });
          setRewardCode(reward.redemptionCode);
          setRewardScoreId(reward.id);
          onReward(reward.redemptionCode);
          setMessage(GAME_COPY.gameOverWinning);
        } catch (err) {
          const text = err instanceof Error ? err.message : '';
          if (text.toLowerCase().includes('cocktail')) {
            await insertGameScore({ orderId, tableNumber, score });
            setMessage(GAME_COPY.alreadyRedeemed);
          } else {
            throw err;
          }
        }
      } else {
        await insertGameScore({ orderId, tableNumber, score });
      }
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo guardar el score');
    }
  };

  if (hidden) return null;

  return (
    <section className="rounded-lg border border-white/[0.08] bg-[#111111] p-4">
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
          Flappy Burger
        </p>
        <p className="mt-2 text-sm leading-6 text-white/64">{GAME_COPY.invitation}</p>
        {error && <p className="mt-2 text-xs text-red-200">{error}</p>}
      </div>
      <div className="relative mx-auto max-w-[480px]">
        <GameCanvas
          weeklyHighScore={weeklyHighScore}
          allTimeHighScore={allTimeHighScore}
          resetToken={resetToken}
          onGameOver={handleGameOver}
        />
        {gameOver && (
          <GameOverScreen
            score={lastScore}
            weeklyHighScore={weeklyHighScore}
            rewardCode={rewardCode}
            message={message}
            onNameSubmit={
              rewardScoreId
                ? async (name: string) => { await updatePlayerName(rewardScoreId, name); await refresh(); }
                : undefined
            }
            onRetry={() => {
              setGameOver(false);
              setResetToken((value) => value + 1);
            }}
            onClose={() => setHidden(true)}
          />
        )}
      </div>
      <div className="mt-4">
        <WeeklyLeaderboard entries={leaderboard} loading={loading} />
      </div>
    </section>
  );
}
