// app/login/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { [k: string]: string | string[] | undefined };
}) {
  const next =
    (typeof searchParams?.next === 'string' && searchParams.next) || '/dashboard';

  // Single source of truth: server cookie via Supabase.
  // If a user exists, redirect ONCE on the server — no client-side loops.
  const supabase = getSupabaseServer();
  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  if (user) redirect(next);

  // Not authenticated: render simple options (no client useEffect, no router.replace).
  return (
    <main className="min-h-[100vh] bg-neutral-950 text-white">
      <section className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-white/70">
          Choose email (magic link) or phone (Nepal-only).
        </p>

        <div className="mt-6 space-y-3">
          <a
            href={`/join?src=login&method=email&next=${encodeURIComponent(next)}`}
            className="block rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm hover:bg-white/10"
          >
            Continue with Email (Magic Link)
          </a>
          <a
            href={`/join?src=login&method=phone&next=${encodeURIComponent(next)}`}
            className="block rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm hover:bg-white/10"
          >
            Continue with Phone (🇳🇵 +977 only)
          </a>
        </div>

        <p className="mt-4 text-center text-xs text-white/50">
          Already signed in? You’ll be sent to <code>{next}</code> automatically.
        </p>
      </section>
    </main>
  );
}
