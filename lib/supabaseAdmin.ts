
// Server-only Admin client for Supabase (service-role).
// Keeps join→dashboard flow untouched.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;

  if (!url) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRole) throw new Error('Missing env: SUPABASE_SERVICE_ROLE');

  _admin = createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { 'x-gn-admin': 'true' } },
  });

  return _admin;
}
