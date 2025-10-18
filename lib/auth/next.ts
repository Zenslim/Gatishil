// lib/auth/next.ts
// Minimal SSR helpers used by login/onboard screens.
// Expand later as needed.
import { getSupabaseServer } from '@/lib/supabase/server';

export async function getSessionUser() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

export async function requireNoSessionRedirect(to: string = '/dashboard') {
  const user = await getSessionUser();
  if (user) {
    // In server contexts you might redirect; here just return a flag.
    return { redirect: to };
  }
  return { ok: true };
}
