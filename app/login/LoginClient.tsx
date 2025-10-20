'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function LoginClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    return createClient(url, anon, {
      auth: {
        persistSession: true,
        // IMPORTANT: don't auto-refresh before we set a clean session
        autoRefreshToken: false,
        detectSessionInUrl: true,
      },
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // 1) Ask the SERVER (cookie source of truth) if the user is authenticated
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        const json = res.ok ? await res.json() : { authenticated: false };

        if (!mounted) return;

        if (json?.authenticated) {
          // 2) If server says YES but browser has no session, pull tokens and set them
          const local = await supabase.auth.getSession();
          const hasLocal = Boolean(local?.data?.session);

          if (!hasLocal) {
            const syncRes = await fetch('/api/auth/sync', { method: 'POST', cache: 'no-store' });
            if (syncRes.ok) {
              const j = await syncRes.json();

              const access_token =
                j?.access_token ?? j?.data?.session?.access_token ?? j?.session?.access_token;
              const refresh_token =
                j?.refresh_token ?? j?.data?.session?.refresh_token ?? j?.session?.refresh_token;

              if (access_token && refresh_token) {
                const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
                if (setErr) {
                  // If we fail to set, clear local storage and fall through to options
                  await supabase.auth.signOut({ scope: 'local' });
                }
              }
            }
          }

          // 3) After syncing, *now* redirect to next (breaks the flicker)
          router.replace(nextPath || '/dashboard');
          return;
        }

        // Server says NOT authenticated → show login options
      } catch (e: any) {
        // If something looks like a stale refresh token error, clear local
        if (typeof e?.message === 'string' && /invalid refresh token|refresh token not found/i.test(e.message)) {
          try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
        }
        // Otherwise ignore; user will see login options
        // console.warn('login: probe failed', e);
      } finally {
        if (mounted) setChecking(false);
      }
    })();

    return () => { mounted = false; };
  }, [router, nextPath, supabase]);

  if (checking) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-10 w-full rounded bg-white/10" />
        <div className="h-10 w-full rounded bg-white/10" />
      </div>
    );
  }

  // Not authenticated on the server; show the two flows.
  return (
    <div className="space-y-3">
      <Link
        href={`/join?src=login&method=email&next=${encodeURIComponent(nextPath || '/dashboard')}`}
        className="block rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm hover:bg-white/10"
      >
        Continue with Email (Magic Link)
      </Link>
      <Link
        href={`/join?src=login&method=phone&next=${encodeURIComponent(nextPath || '/dashboard')}`}
        className="block rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm hover:bg-white/10"
      >
        Continue with Phone (🇳🇵 +977 only)
      </Link>
      <p className="pt-2 text-center text-xs text-white/60">
        Already signed in on this device? We’ll take you to your dashboard automatically.
      </p>
    </div>
  );
}
