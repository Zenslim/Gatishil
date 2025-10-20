// app/login/LoginClient.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Use the public anon key for client-side checks only (no privileged calls).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnon);

export default function LoginClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data?.session) {
          // Already signed in → go straight to next
          router.replace(nextPath || '/dashboard');
          return;
        }
      } catch (e) {
        // Ignore; show options
        console.warn('login: session check failed', e);
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, nextPath]);

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
        Trouble signing in? <a href="/help" className="underline decoration-white/30 hover:decoration-white">Get help</a>
      </p>
    </div>
  );
}
