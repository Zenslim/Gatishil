// app/join/page.tsx
// Gatishil — First-time Security Ritual (Client-only, no extra packages)
// ELI15: You just signed in. Set a password once so your device can remember it
// (biometrics will autofill next time). Then go straight to /dashboard.
// If already set, we auto-continue to /dashboard. If not signed in, go to /login.

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function JoinSecurityPage() {
  const router = useRouter();
  const qs = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // 1) Require a session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      // 2) If already completed ritual → inside
      const { data: profile } = await supabase
        .from('profiles')
        .select('password_set')
        .eq('id', session.user.id)
        .maybeSingle();

      if (mounted) {
        if (profile?.password_set) {
          router.replace('/dashboard');
          return;
        }
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!password || password.length < 8) {
      setErr('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setErr('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // Update the signed-in user's password (device will offer to save it)
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) {
        setErr(upErr.message || 'Could not set password.');
        setLoading(false);
        return;
      }

      // Mark ritual done so future visits skip /join
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase
          .from('profiles')
          .upsert({ id: session.user.id, password_set: true }, { onConflict: 'id' });
      }

      // Go inside
      router.replace('/dashboard');
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong.');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070b14] text-white grid place-items-center">
        <div className="text-white/70">Preparing your entry…</div>
      </main>
    );
  }

  const urlError = qs.get('error');
  const hint =
    urlError === 'weak-or-mismatch'
      ? 'Please choose a stronger password and make sure both fields match.'
      : urlError === 'update-failed'
      ? 'We could not set your password. Try again.'
      : null;

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/5 bg-white/0 border-b border-white/10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="font-semibold">Gatishil — Entry</h1>
          </div>
          <Link href="/dashboard" className="text-sm text-white/80 hover:text-white">
            Skip for now →
          </Link>
        </div>
      </header>

      <section className="max-w-xl mx-auto px-4 pt-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-semibold">Set your key once</h2>
          <p className="text-white/70 mt-2 text-sm">
            Save a password your device can remember. Next time, your phone or laptop
            can unlock it with biometrics—no OTP gatekeeper.
          </p>

          {(hint || err) && (
            <div className="mt-4 text-sm text-red-300">
              {hint || err}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <div>
              <label className="block text-sm text-white/80 mb-1">New password</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-400/60"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-white/80 mb-1">Confirm password</label>
              <input
                name="confirm"
                type="password"
                required
                minLength={8}
                placeholder="Repeat your password"
                className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-400/60"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white text-black px-4 py-2.5 font-medium hover:opacity-90 disabled:opacity-70"
            >
              Save & enter the interior →
            </button>

            <p className="text-xs text-white/60">
              Tip: when your browser asks to “Save Password,” say yes. Most devices let you unlock
              saved passwords with biometrics—one-tap sign-in next time.
            </p>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-white/50">
          You can change this later in <Link href="/security" className="underline">Security</Link>.
        </div>
      </section>
    </main>
  );
}
