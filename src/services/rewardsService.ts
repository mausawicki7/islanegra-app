import { supabase } from './supabaseClient';
import { generateRedemptionCode } from '@/utils/generateRedemptionCode';
import { insertGameScore } from './gameScoresService';

export interface CocktailReward {
  id: string;
  orderId: string;
  tableNumber: number;
  score: number;
  redemptionCode: string;
  wonAt: string;
  redeemedAt: string | null;
  redeemedBy: string | null;
}

interface RewardRow {
  id: string;
  order_id: string;
  table_number: number;
  score: number;
  played_at: string;
  redemption_code: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
}

function mapReward(row: RewardRow): CocktailReward {
  return {
    id: row.id,
    orderId: row.order_id,
    tableNumber: row.table_number,
    score: row.score,
    redemptionCode: row.redemption_code,
    wonAt: row.played_at,
    redeemedAt: row.redeemed_at,
    redeemedBy: row.redeemed_by,
  };
}

export async function createRewardScore(input: {
  orderId: string;
  tableNumber: number;
  score: number;
}): Promise<CocktailReward> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const redemptionCode = generateRedemptionCode();
    try {
      const score = await insertGameScore({
        ...input,
        redemptionCode,
      });
      return {
        id: score.id,
        orderId: score.orderId,
        tableNumber: score.tableNumber,
        score: score.score,
        redemptionCode,
        wonAt: score.playedAt,
        redeemedAt: score.redeemedAt,
        redeemedBy: null,
      };
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : '';
      if (!message.toLowerCase().includes('duplicate')) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('No se pudo crear el premio');
}

export async function fetchRewardForOrder(orderId: string): Promise<CocktailReward | null> {
  const { data, error } = await supabase
    .from('game_scores')
    .select('id, order_id, table_number, score, played_at, redemption_code, redeemed_at, redeemed_by')
    .eq('order_id', orderId)
    .not('redemption_code', 'is', null)
    .order('played_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapReward(data as RewardRow) : null;
}

export async function fetchPendingRewards(): Promise<CocktailReward[]> {
  const { data, error } = await supabase
    .from('game_scores')
    .select('id, order_id, table_number, score, played_at, redemption_code, redeemed_at, redeemed_by')
    .not('redemption_code', 'is', null)
    .is('redeemed_at', null)
    .order('played_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as RewardRow[] | null)?.map(mapReward) ?? [];
}

export async function findRewardByCode(code: string): Promise<CocktailReward | null> {
  const { data, error } = await supabase
    .from('game_scores')
    .select('id, order_id, table_number, score, played_at, redemption_code, redeemed_at, redeemed_by')
    .eq('redemption_code', code.trim().toUpperCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapReward(data as RewardRow) : null;
}

export async function redeemReward(id: string, redeemedBy?: string): Promise<void> {
  const { error } = await supabase
    .from('game_scores')
    .update({
      redeemed_at: new Date().toISOString(),
      redeemed_by: redeemedBy?.trim() || null,
    })
    .eq('id', id)
    .is('redeemed_at', null);

  if (error) throw new Error(error.message);
}

export function subscribeToRewards(onChange: () => void): () => void {
  const channel = supabase
    .channel('cocktail-rewards')
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
