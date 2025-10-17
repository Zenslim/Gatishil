import type { SupabaseClient } from '@supabase/supabase-js';

/** Polls for a Supabase session right after OTP/magic-link. */
export async function waitForSession(
  supabase: SupabaseClient,
  tries = 20,
  delayMs = 250
): Promise<{ access_token: string; refresh_token: string | null } | null> {
  for (let i = 0; i < tries; i++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        access_token: session.access_token,
        refresh_token: session.refresh_token ?? null,
      };
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}
