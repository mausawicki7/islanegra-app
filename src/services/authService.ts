import { supabase } from './supabaseClient';

export type UserRole = 'owner' | 'partner' | 'kitchen';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  partnerId: string | null;
  active: boolean;
}

interface ProfileRow {
  id: string;
  email: string;
  role: UserRole;
  partner_id: string | null;
  active: boolean;
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    partnerId: row.partner_id,
    active: row.active,
  };
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProfile(data as ProfileRow) : null;
}
