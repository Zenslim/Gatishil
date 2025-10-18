// lib/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (_client) return _client;

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const sync = async () => {
    const { data: { session } } = await _client!.auth.getSession();
    const access_token = session?.access_token ?? null;
    const refresh_token = session?.refresh_token ?? null;
    if (!access_token) return;
    await fetch('/api/auth/sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ access_token, refresh_token }),
    }).catch(() => {});
  };

  _client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') sync();
  });

  return _client;
}
