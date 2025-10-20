// app/login/LoginClient.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Probe the server session via API (cookie-based, source of truth)
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          if (json?.authenticated) {
            router.replace(nextPath || '/dashboard');
            return;
          }
        }
      } catch (e) {
        // Ignore; fall through to options
        console.warn('login: server session probe failed', e);
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => { mounted = false; };
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
        Already signed in? We’ll send you to your console automatically.
      </p>
    </div>
  );
}
