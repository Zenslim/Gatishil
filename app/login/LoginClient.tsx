'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function LoginClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Create the client lazily in the browser with safe auth settings:
  // - autoRefreshToken: false  => do NOT auto-refresh a possibly stale/invalid token on load
  // - detectSessionInUrl: false => do NOT parse URL for tokens (we’re not finishing an OAuth flow here)
  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    return createClient(supabaseUrl, supabaseAnon, {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Quick probe of current session; DO NOT trigger refresh automatically
        const { data, error } = await supabase.auth.getSession();

        // If Supabase complains about a bad refresh token, nuke local state and continue cleanly
        if (error?.message && /invalid refresh token|refresh token not found/i.test(error.message)) {
          await supabase.auth.signOut({ scope: 'local' }); // clears local storage/cookies for this client only
        }

        if (!mounted) return;

        if (data?.session) {
          // Already signed in → go straight to next
          router.replace(nextPath || '/dashboard');
          return;
        }
      } catch (e: any) {
        // Defensive: if anything smells like a refresh error, clear local and proceed
        if (typeof e?.message === 'string' && /invalid refresh token|refresh token not found/i.test(e.message)) {
          try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
        }
        // We intentionally ignore other errors here; user will see the login options
        console.warn('login: session probe failed', e);
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
        If you still see errors, clear site data for <code>gatishilnepal.org</code> and retry.
      </p>
    </div>
  );
}
