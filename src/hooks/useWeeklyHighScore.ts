import { useCallback, useEffect, useState } from 'react';
import {
  fetchAllTimeHighScore,
  fetchWeeklyHighScore,
  fetchWeeklyLeaderboard,
  subscribeToWeeklyScores,
  type LeaderboardEntry,
} from '@/services/gameScoresService';

export function useWeeklyHighScore() {
  const [weeklyHighScore, setWeeklyHighScore] = useState(0);
  const [allTimeHighScore, setAllTimeHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [weekly, allTime, top] = await Promise.all([
        fetchWeeklyHighScore(),
        fetchAllTimeHighScore(),
        fetchWeeklyLeaderboard(5),
      ]);
      setWeeklyHighScore(weekly);
      setAllTimeHighScore(allTime);
      setLeaderboard(top);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ranking');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeToWeeklyScores(() => {
      void refresh();
    });
    return unsubscribe;
  }, [refresh]);

  return {
    weeklyHighScore,
    allTimeHighScore,
    leaderboard,
    loading,
    error,
    refresh,
  };
}
