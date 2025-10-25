// Server-only Admin client for Supabase.
// Keeps your join→dashboard flow untouched by isolating service-role operations
// (e.g., updating auth user password during TrustStep PIN set).
//
// Usage example (server routes only):
//   import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
//   const admin = getSupabaseAdmin();
//   await admin.auth.admin.updateUserById(userId, { password: newSecret });
//
// Required env (set in Vercel → Project → Settings → Environment Variables):
//   - NEXT_PUBLIC_SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE   (never expose to the browser)

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;

  if (!url) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRole) throw new Error('Missing env: SUPABASE_SERVICE_ROLE');

  // Admin client must never persist session or run on the client.
  _admin = createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-gn-admin': 'true',
      },
    },
  });

  return _admin;
}
