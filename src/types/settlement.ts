export type SettlementStatus = 'draft' | 'confirmed' | 'paid';

export interface Partner {
  id: string;
  name: string;
  percentage: number;
  active: boolean;
  startDate: string;
  endDate: string | null;
}

export interface PartnerPayout {
  id: string;
  settlementId: string;
  partnerId: string;
  partnerName: string;
  percentage: number;
  amount: number;
  paid: boolean;
  paidAt: string | null;
}

export interface MonthlySettlement {
  id: string;
  /** First day of the month, ISO date (YYYY-MM-DD). */
  month: string;
  grossRevenue: number;
  status: SettlementStatus;
  confirmedAt: string | null;
  notes: string | null;
  payouts: PartnerPayout[];
}

/**
 * Lightweight view of a month, including the live (un-confirmed) view.
 * Used by the settlements list, where past months may not have a row yet.
 */
export interface SettlementMonthView {
  /** First day of the month, ISO date. */
  month: string;
  grossRevenue: number;
  status: SettlementStatus | 'draft';
  totalPayouts: number;
  settlementId: string | null;
}
