// app/onboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';   // no static optimization
export const fetchCache = 'force-no-store';

async function waitForSession(maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const { data } = await supabase.auth.getSession();
    if (data?.session) return data.session;
    // tiny pause
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, 200));
  }
  return null;
}

export default function OnboardPage() {
  noStore();

  const router = useRouter();
  const { get } = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [sessionOk, setSessionOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sub = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (!cancelled && sess) {
        setSessionOk(true);
        setLoading(false);
      }
    });

    (async () => {
      const sess = await waitForSession(15000);
      if (!cancelled) {
        setSessionOk(!!sess);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    // skeleton during hydration window
    return (
      <main className="min-h-dvh flex items-center justify-center bg-black text-white">
        <div className="animate-pulse text-sm text-slate-300">Checking your session…</div>
      </main>
    );
  }

  if (!sessionOk) {
    // graceful fallback if cookies never landed
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-black text-white">
        <div className="text-slate-200">We couldn’t detect your session yet.</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-white text-black font-semibold"
        >
          Reload and continue
        </button>
        <p className="text-xs text-slate-400">If this persists, try the link again.</p>
      </main>
    );
  }

  // ✅ Auth is ready — render your actual onboarding UI here
  return (
    <main className="min-h-dvh bg-black text-white">
      <section className="p-8">
        <h1 className="text-3xl font-bold">Onboarding</h1>
        <p className="mt-2 text-slate-300">src = {get('src') || 'unknown'}</p>
        {/* your onboarding flow/components */}
      </section>
    </main>
  );
}
