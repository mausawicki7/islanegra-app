import { supabase } from './supabaseClient';
import type {
  MonthlySettlement,
  PartnerPayout,
  SettlementMonthView,
  SettlementStatus,
} from '@/types/settlement';
import { fetchPartners } from './partnersService';
import {
  endOfMonthIso,
  firstOfMonth,
  formatMonthLabel,
  monthRange,
  startOfMonthIso,
} from '@/utils/monthHelpers';

interface SettlementRow {
  id: string;
  month: string;
  gross_revenue: number | string;
  status: SettlementStatus;
  confirmed_at: string | null;
  notes: string | null;
  partner_payouts: PayoutRow[];
}

interface PayoutRow {
  id: string;
  settlement_id: string;
  partner_id: string;
  partner_name: string;
  percentage: number | string;
  amount: number | string;
  paid: boolean;
  paid_at: string | null;
}

function mapPayout(row: PayoutRow): PartnerPayout {
  return {
    id: row.id,
    settlementId: row.settlement_id,
    partnerId: row.partner_id,
    partnerName: row.partner_name,
    percentage: Number(row.percentage),
    amount: Number(row.amount),
    paid: row.paid,
    paidAt: row.paid_at,
  };
}

function mapSettlement(row: SettlementRow): MonthlySettlement {
  return {
    id: row.id,
    month: row.month,
    grossRevenue: Number(row.gross_revenue),
    status: row.status,
    confirmedAt: row.confirmed_at,
    notes: row.notes,
    payouts: (row.partner_payouts ?? []).map(mapPayout),
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function fetchSettlements(): Promise<MonthlySettlement[]> {
  const { data, error } = await supabase
    .from('monthly_settlements')
    .select('*, partner_payouts(*)')
    .order('month', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as SettlementRow[] | null)?.map(mapSettlement) ?? [];
}

export async function fetchSettlementByMonth(
  monthIso: string,
): Promise<MonthlySettlement | null> {
  const { data, error } = await supabase
    .from('monthly_settlements')
    .select('*, partner_payouts(*)')
    .eq('month', firstOfMonth(new Date(monthIso)))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapSettlement(data as SettlementRow) : null;
}

/** Sum of collected revenue with status delivered between [start, end). */
async function fetchMonthRevenue(monthIso: string): Promise<number> {
  const { data, error } = await supabase
    .from('orders')
    .select('total_amount, total')
    .eq('status', 'delivered')
    .gte('created_at', startOfMonthIso(monthIso))
    .lt('created_at', endOfMonthIso(monthIso));
  if (error) throw new Error(error.message);
  return (data ?? []).reduce(
    (sum, r) => {
      const row = r as { total_amount: number | null; total: number };
      return sum + Number(row.total_amount ?? row.total);
    },
    0,
  );
}

async function fetchEarliestDeliveredMonth(): Promise<string | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('created_at')
    .eq('status', 'delivered')
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0] as { created_at: string } | undefined;
  if (!row) return null;
  return firstOfMonth(new Date(row.created_at));
}

/**
 * Builds the full month-by-month view for the settlements list:
 *   - confirmed/paid months come from monthly_settlements (frozen).
 *   - current month and any past month without a row are computed live from
 *     orders + active partners.
 */
export async function fetchSettlementMonths(): Promise<SettlementMonthView[]> {
  const [settlements, partners, earliest] = await Promise.all([
    fetchSettlements(),
    fetchPartners(),
    fetchEarliestDeliveredMonth(),
  ]);

  const currentMonth = firstOfMonth(new Date());
  const startMonth = earliest && earliest < currentMonth ? earliest : currentMonth;
  const months = monthRange(startMonth, currentMonth);

  const byMonth = new Map(settlements.map((s) => [s.month, s]));
  const out: SettlementMonthView[] = [];

  for (const m of months) {
    const existing = byMonth.get(m);
    if (existing && existing.status !== 'draft') {
      out.push({
        month: m,
        grossRevenue: existing.grossRevenue,
        status: existing.status,
        totalPayouts: existing.payouts.reduce((sum, p) => sum + p.amount, 0),
        settlementId: existing.id,
      });
      continue;
    }
    // Compute live for current month or past months that haven't been
    // confirmed yet.
    const revenue = await fetchMonthRevenue(m);
    const totalPct = partners
      .filter((p) => p.active)
      .reduce((sum, p) => sum + p.percentage, 0);
    out.push({
      month: m,
      grossRevenue: revenue,
      status: 'draft',
      totalPayouts: (revenue * totalPct) / 100,
      settlementId: existing?.id ?? null,
    });
  }

  return out.sort((a, b) => (a.month < b.month ? 1 : -1));
}

/** Live draft for a month: revenue + computed payouts using active partners. */
export async function buildLiveDraft(monthIso: string): Promise<MonthlySettlement> {
  const [revenue, partners] = await Promise.all([
    fetchMonthRevenue(monthIso),
    fetchPartners(),
  ]);
  const payouts: PartnerPayout[] = partners
    .filter((p) => p.active)
    .map((p) => ({
      id: `draft-${p.id}`,
      settlementId: 'draft',
      partnerId: p.id,
      partnerName: p.name,
      percentage: p.percentage,
      amount: Math.round(revenue * p.percentage) / 100,
      paid: false,
      paidAt: null,
    }));
  return {
    id: 'draft',
    month: firstOfMonth(new Date(monthIso)),
    grossRevenue: revenue,
    status: 'draft',
    confirmedAt: null,
    notes: null,
    payouts,
  };
}

// ---------------------------------------------------------------------------
// Mutations (owner-only enforced by RLS)
// ---------------------------------------------------------------------------

export async function confirmSettlement(monthIso: string): Promise<string> {
  const month = firstOfMonth(new Date(monthIso));
  const { data, error } = await supabase.rpc('confirm_monthly_settlement', {
    target_month: month,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function autoConfirmPastMonths(): Promise<number> {
  const { data, error } = await supabase.rpc('auto_confirm_past_months');
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function togglePayoutPaid(
  payoutId: string,
  paid: boolean,
): Promise<PartnerPayout> {
  const { data, error } = await supabase
    .from('partner_payouts')
    .update({ paid, paid_at: paid ? new Date().toISOString() : null })
    .eq('id', payoutId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapPayout(data as PayoutRow);
}

export async function markSettlementPaid(settlementId: string): Promise<void> {
  const { error } = await supabase
    .from('monthly_settlements')
    .update({ status: 'paid' })
    .eq('id', settlementId);
  if (error) throw new Error(error.message);
}

export async function updateSettlementNotes(
  settlementId: string,
  notes: string,
): Promise<void> {
  const { error } = await supabase
    .from('monthly_settlements')
    .update({ notes })
    .eq('id', settlementId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export function settlementLabel(monthIso: string): string {
  return formatMonthLabel(monthIso);
}
