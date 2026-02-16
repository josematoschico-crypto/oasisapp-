import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uxyrzxptvqtfgmxrfadv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Fv1hw17CjMp95zpPFR2m0g_N2uGMRU8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});