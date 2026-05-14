import { supabase } from './supabaseClient';
import { getWeekStart } from '@/utils/getWeekStart';

export interface GameScore {
  id: string;
  orderId: string;
  tableNumber: number;
  score: number;
  playedAt: string;
  weekStart: string;
  redemptionCode: string | null;
  redeemedAt: string | null;
}

export interface LeaderboardEntry {
  tableNumber: number;
  score: number;
  playedAt: string;
}

interface GameScoreRow {
  id: string;
  order_id: string;
  table_number: number;
  score: number;
  played_at: string;
  week_start: string;
  redemption_code: string | null;
  redeemed_at: string | null;
}

function mapScore(row: GameScoreRow): GameScore {
  return {
    id: row.id,
    orderId: row.order_id,
    tableNumber: row.table_number,
    score: row.score,
    playedAt: row.played_at,
    weekStart: row.week_start,
    redemptionCode: row.redemption_code,
    redeemedAt: row.redeemed_at,
  };
}

export async function fetchWeeklyLeaderboard(limit = 5): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('game_scores')
    .select('table_number, score, played_at')
    .eq('week_start', getWeekStart())
    .order('score', { ascending: false })
    .order('played_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    tableNumber: Number(row.table_number),
    score: Number(row.score),
    playedAt: row.played_at,
  }));
}

export async function fetchWeeklyHighScore(): Promise<number> {
  const [top] = await fetchWeeklyLeaderboard(1);
  return top?.score ?? 0;
}

export async function fetchAllTimeHighScore(): Promise<number> {
  const { data, error } = await supabase
    .from('game_scores')
    .select('score')
    .order('score', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? Number(data.score) : 0;
}

export async function insertGameScore(input: {
  orderId: string;
  tableNumber: number;
  score: number;
  redemptionCode?: string | null;
}): Promise<GameScore> {
  const { data, error } = await supabase
    .from('game_scores')
    .insert({
      order_id: input.orderId,
      table_number: input.tableNumber,
      score: input.score,
      week_start: getWeekStart(),
      redemption_code: input.redemptionCode ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapScore(data as GameScoreRow);
}

export function subscribeToWeeklyScores(onChange: () => void): () => void {
  const channel = supabase
    .channel('weekly-game-scores')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_scores' },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
