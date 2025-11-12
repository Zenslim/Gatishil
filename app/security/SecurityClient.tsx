// app/security/SecurityClient.tsx — CLIENT logic (hooks + Supabase)
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/unifiedClient';

export default function SecurityClient() {
  const router = useRouter();
  const params = useSearchParams();

  const [identifier, setIdentifier] = useState<string>('');
  const [hasSession, setHasSession] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data?.session ?? null;
      setHasSession(!!sess);
      if (sess?.user) {
        let profilePhone: string | null = null;
        let profileEmail: string | null = null;
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('phone,email')
            .eq('id', sess.user.id)
            .maybeSingle();
          profilePhone = typeof profile?.phone === 'string' ? profile.phone : null;
          profileEmail = typeof profile?.email === 'string' ? profile.email : null;
        } catch (profileErr) {
          console.warn('security:profiles lookup failed', profileErr);
        }
        const label =
          sess.user.phone ??
          profilePhone ??
          sess.user.email ??
          profileEmail ??
          '';
        setIdentifier(label);
      } else {
        setIdentifier('');
      }

      // Optional: enrich profile on first load using query params
      const name = params.get('name');
      const role = params.get('role');
      if (sess && (name || role)) {
        // Example if you have public.profiles:
        // await supabase.from('profiles').upsert({ id: sess.user.id, name, role }, { onConflict: 'id' });
      }
    })();
  }, [params]);

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setMsg(''); setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg('Password set. Redirecting…');
      setTimeout(() => router.replace('/dashboard'), 600);
    } catch (e: any) {
      setErr(e?.message || 'Failed to set password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh p-6 md:p-10 text-white bg-gradient-to-b from-slate-900 to-black">
      <section className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-widest text-sky-300/80">GatishilNepal.org</p>
        <h1 className="text-2xl md:text-4xl font-bold mt-2">Security</h1>
        <p className="text-slate-300/90 mt-2">
          You proved your identity with OTP or Magic Link/OAuth. Now set a password so next time your device
          can unlock it with biometrics (no OTP or Magic Link loops).
        </p>
        <p className="text-slate-300/90 mt-2">
          Your device can unlock with Face ID, Touch ID, Android Biometric Prompt, or Windows Hello (laptop + desktop).
          If that’s not available, your 4-digit PIN works anywhere.
        </p>

        {!hasSession ? (
          <p className="mt-6 text-sm text-rose-300">
            Not signed in. Go to <a href="/join" className="underline">/join</a>.
          </p>
        ) : (
          <form onSubmit={savePassword} className="mt-6 space-y-3">
            <div className="text-sm text-slate-300/80">
              Signed in as <span className="text-white font-semibold">{identifier || 'unknown'}</span>
            </div>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 placeholder:text-slate-400"
            />
            <button
              disabled={saving || password.length < 8}
              className="w-full px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save & Go to Dashboard'}
            </button>
            {!!msg && <p className="text-xs text-emerald-300">{msg}</p>}
            {!!err && <p className="text-xs text-rose-300">{err}</p>}
          </form>
        )}
      </section>
    </main>
  );
}
