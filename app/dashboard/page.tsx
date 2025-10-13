// app/dashboard/page.tsx — Private landing
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) { router.replace('/join'); return; }
      setEmail(session.user.email ?? null);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [router]);

  if (loading) {
    return <main className="min-h-dvh grid place-items-center text-sm text-slate-400">Loading your dashboard…</main>;
  }

  return (
    <main className="min-h-dvh p-6 md:p-10 text-white bg-gradient-to-b from-slate-900 to-black">
      <section className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-widest text-sky-300/80">GatishilNepal.org</p>
        <h1 className="text-2xl md:text-4xl font-bold mt-2">Welcome{email ? `, ${email}` : ''}</h1>
        <p className="text-slate-300/90 mt-3">
          This is your movement console. From here you can vote on polls, review proposals, and track decisions.
        </p>
        <div className="mt-6 grid sm:grid-cols-3 gap-3 text-sm">
          <a href="/polls" className="rounded-xl bg-white/10 border border-white/10 p-4 hover:bg-white/15">🗳️ Polls</a>
          <a href="/proposals" className="rounded-xl bg-white/10 border border-white/10 p-4 hover:bg-white/15">📜 Proposals</a>
          <a href="/security" className="rounded-xl bg-white/10 border border-white/10 p-4 hover:bg-white/15">🔒 Security</a>
        </div>
        <form
          className="mt-6"
          onSubmit={async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = '/join';
          }}
        >
          <button className="px-4 py-2 rounded-xl bg-white text-black font-semibold">Sign out</button>
        </form>
      </section>
    </main>
  );
}
