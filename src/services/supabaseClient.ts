import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Orders will fail to persist until env vars are set.',
  );
}

export const supabase = createClient(url ?? '', key ?? '', {
  auth: { persistSession: false },
});

export const isSupabaseConfigured = Boolean(url && key);
