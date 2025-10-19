import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Export name and path must match: import { getSupabaseServer } from '@/lib/supabase/server'
export function getSupabaseServer() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = process.env;

  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase server credentials missing');
  }

  const cookieStore = cookies();

  // Modern cookies
  const sbAccess = cookieStore.get('sb-access-token')?.value || null;
  const sbRefresh = cookieStore.get('sb-refresh-token')?.value || null;

  // Legacy JSON cookie (some older code still sets/reads this)
  let legacyAccess: string | null = null;
  let legacyRefresh: string | null = null;
  try {
    const raw = cookieStore.get('supabase-auth-token')?.value;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.access_token === 'string') legacyAccess = parsed.access_token;
      if (typeof parsed?.refresh_token === 'string') legacyRefresh = parsed.refresh_token;
    }
  } catch {}

  const effectiveAccess = sbAccess || legacyAccess || null;
  const effectiveRefresh = sbRefresh || legacyRefresh || null;

  return createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          if (name === 'sb-access-token' && effectiveAccess) return effectiveAccess;
          if (name === 'sb-refresh-token' && effectiveRefresh) return effectiveRefresh;
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}
