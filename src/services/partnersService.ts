import { supabase } from './supabaseClient';
import type { Partner } from '@/types/settlement';

interface PartnerRow {
  id: string;
  name: string;
  percentage: number | string;
  active: boolean;
  start_date: string;
  end_date: string | null;
}

function mapPartner(row: PartnerRow): Partner {
  return {
    id: row.id,
    name: row.name,
    percentage: Number(row.percentage),
    active: row.active,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

export async function fetchPartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as PartnerRow[] | null)?.map(mapPartner) ?? [];
}

export interface PartnerInput {
  name: string;
  percentage: number;
  active: boolean;
}

export async function createPartner(input: PartnerInput): Promise<Partner> {
  const { data, error } = await supabase
    .from('partners')
    .insert({
      name: input.name.trim(),
      percentage: input.percentage,
      active: input.active,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapPartner(data as PartnerRow);
}

export async function updatePartner(id: string, patch: Partial<PartnerInput>): Promise<Partner> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.percentage !== undefined) payload.percentage = patch.percentage;
  if (patch.active !== undefined) payload.active = patch.active;
  const { data, error } = await supabase
    .from('partners')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapPartner(data as PartnerRow);
}

export async function deactivatePartner(id: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('partners')
    .update({ active: false, end_date: today })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
