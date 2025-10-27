'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/* ---------- small SVG icon set (no extra deps) ---------- */
const Icon = {
  Fingerprint: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M12 2a7 7 0 0 1 7 7v1a1 1 0 1 1-2 0V9a5 5 0 0 0-10 0v1a1 1 0 1 1-2 0V9a7 7 0 0 1 7-7zm0 5a4 4 0 0 1 4 4v1.5a1 1 0 1 1-2 0V11a2 2 0 0 0-4 0v.5a1 1 0 1 1-2 0V11a4 4 0 0 1 4-4zm0 5.5a1.5 1.5 0 0 1 1.5 1.5v3.25a1 1 0 1 1-2 0V14a.5.5 0 0 0-1 0v1.25a1 1 0 1 1-2 0V14a2.5 2.5 0 0 1 5 0zm-6 2.75a1 1 0 1 1 2 0v1.25a3 3 0 1 0 6 0V15a1 1 0 1 1 2 0v1.5a5 5 0 1 1-10 0V13.25z"
        fill="currentColor"
      />
    </svg>
  ),
  FaceId: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M5 3h3a1 1 0 1 1 0 2H6v2a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm13 0a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0V5h-2a1 1 0 1 1 0-2h3zM5 17a1 1 0 1 1 2 0v2h2a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1v-3zm12 0a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1h-3a1 1 0 1 1 0-2h2v-2zM9 9.5a1 1 0 1 1-2 0c0-.83.67-1.5 1.5-1.5S10 8.67 10 9.5a1 1 0 1 1-2 0zm8 0a1 1 0 1 1-2 0c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5zm-5 5.5a4 4 0 0 1-3.464-2 1 1 0 0 1 1.732-1A2 2 0 0 0 12 13a2 2 0 0 0 1.732-1 1 1 0 1 1 1.732 1A4 4 0 0 1 12 15z"
        fill="currentColor"
      />
    </svg>
  ),
  WindowsHello: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 16c1.5 1.8 3.9 3 7 3s5.5-1.2 7-3a1 1 0 0 0-1.5-1.3C16.4 16.1 14.4 17 12 17s-4.4-.9-5.5-2.3A1 1 0 0 0 5 16z"
        fill="currentColor"
      />
    </svg>
  ),
};

/* ---------- helpers (SSR-safe) ---------- */
function detectMethod(input: string): 'email' | 'phone' {
  const v = input.trim();
  return v.includes('@') ? 'email' : 'phone';
}

/** UA-based hint, runs **after mount** only */
function pickBiometricFlavor(): 'hello' | 'fingerprint' | 'face' | 'combo' {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isWindows = /Windows NT/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  if (isWindows) return 'hello';
  if (isAndroid) return 'fingerprint';
  if (isIOS) return 'face';
  return 'combo';
}

/** Try to obtain a Supabase client from project code; if not present, build one. */
async function getSupabaseClient() {
  try {
    const mod: any = await import('@/lib/supabase/client');
    const candidates = [
      mod.createClient,
      mod.default,
      mod.createBrowserClient,
      mod.getClient,
      mod.client,
      mod.sb,
      mod.supabase,
    ].filter(Boolean);
    for (const c of candidates) {
      if (typeof c === 'function') return c();
      if (typeof c === 'object' && c?.auth) return c;
    }
    if (typeof mod?.makeClient === 'function') return mod.makeClient();
    if (typeof mod?.buildClient === 'function') return mod.buildClient();
  } catch {
    /* fall through */
  }
  const { createClient } = await import('@supabase/supabase-js');
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    (globalThis as any).__SUPABASE_URL__;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    (globalThis as any).__SUPABASE_ANON__;
  if (!url || !anon) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for fallback client.'
    );
  }
  return createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

/* ---------- component ---------- */
export default function LoginClient() {
  const q = useSearchParams();
  const next = q.get('next') || '/dashboard';

  const [user, setUser] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // SSR-safe flags
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const webAuthnAvailable =
    mounted && typeof window !== 'undefined' && 'PublicKeyCredential' in window;

  // Render-neutral flavor on SSR, specialize **after mount** to avoid hydration mismatch
  const [flavor, setFlavor] = useState<'hello' | 'fingerprint' | 'face' | 'combo'>('combo');
  useEffect(() => {
    setFlavor(pickBiometricFlavor());
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const method = detectMethod(user);
    if (!user.trim()) return setErr('Enter your email or phone.');
    if (!/^\d{4,8}$/.test(pin)) return setErr('Enter a 4–8 digit PIN.');

    setBusy(true);
    setErr(null);
    try {
      const payload =
        method === 'email'
          ? { email: user.trim(), pin }
          : { phone: user.trim(), pin };

      const res = await fetch('/api/pin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 204) {
        window.location.replace(next || '/dashboard');
        return;
      }

      let message = 'Could not sign in with PIN';
      if (res.status === 401) message = 'Wrong PIN. Try again.';
      else if (res.status === 404)
        message = 'We could not find an account with that email or phone.';
      else if (res.status === 409) message = 'This account does not have a PIN yet.';
      else {
        try {
          const body = await res.clone().json();
          if (body?.error) message = body.error;
          else if (typeof body === 'string' && body) message = body;
        } catch {
          const text = await res.text().catch(() => '');
          if (text) message = text;
        }
      }
      setErr(message);
    } catch (e: any) {
      setErr(e?.message || 'Could not sign in with PIN');
    } finally {
      setBusy(false);
    }
  }

  // Biometric / Passkey sign-in (substitutes for entering PIN)
  async function onBiometricLogin() {
    if (busy) return;
    const identifier = user.trim();
    if (!identifier) return setErr('Enter your email or phone first.');
    if (!webAuthnAvailable) return setErr('This device/browser does not support biometrics here.');

    setBusy(true);
    setErr(null);
    try {
      const supabase = await getSupabaseClient();

      const fn = (supabase as any)?.auth?.signInWithPasskey;
      if (typeof fn !== 'function') {
        throw new Error('Biometric login not available in current Supabase SDK. Update @supabase/supabase-js.');
      }

      const { data, error } = await supabase.auth.signInWithPasskey({ identifier });
      if (error) throw error;
      if (!data?.session) throw new Error('No active session after biometrics.');

      // Mirror SSR cookies for middleware/SSR
      const sync = await fetch('/api/auth/sync', { method: 'POST', credentials: 'include' });
      if (!sync.ok) throw new Error('Session sync failed.');

      window.location.replace(next || '/dashboard');
    } catch (e: any) {
      const name = e?.name || '';
      if (name === 'NotAllowedError') {
        setErr('Biometric prompt was cancelled. You can try again or use your PIN.');
      } else if (/(no passkey|not registered|unsupported)/i.test(e?.message)) {
        setErr('No passkey found on this device for that account. Use your PIN.');
      } else {
        setErr(e?.message || 'Biometric sign-in failed. Use your PIN.');
      }
    } finally {
      setBusy(false);
    }
  }

  const IconSet = useMemo(() => {
    const base = 'h-5 w-5';
    if (flavor === 'fingerprint') return <Icon.Fingerprint className={base} />;
    if (flavor === 'face') return <Icon.FaceId className={base} />;
    if (flavor === 'hello') return <Icon.WindowsHello className={base} />;
    return (
      <span className="flex items-center gap-2">
        <Icon.FaceId className={base} />
        <Icon.Fingerprint className={base} />
        <Icon.WindowsHello className={base} />
      </span>
    );
  }, [flavor]);

  const label =
    flavor === 'fingerprint'
      ? 'Use fingerprint'
      : flavor === 'face'
      ? 'Use Face ID'
      : flavor === 'hello'
      ? 'Use Windows Hello'
      : 'Use biometrics (Face/Touch/Hello)';

  return (
    <div className="min-h-[80vh] grid place-items-center bg-neutral-950 text-white p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-6">
        <h1 className="text-xl font-semibold">Sign in with PIN</h1>
        <p className="text-sm text-white/70 mt-1">
          Use your email or phone and the 4–8 digit PIN you set during Trust.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-300">Email or phone</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="you@example.com or +97798…"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300">PIN (4–8 digits)</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={8}
            />
          </div>

          {err && <p className="text-sm text-red-400">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="my-2 text-center text-xs text-white/50 select-none">or</div>

          <button
            type="button"
            onClick={onBiometricLogin}
            disabled={busy || !user.trim() || !webAuthnAvailable}
            className="w-full py-3 rounded-xl border border-white/20 hover:bg-white/5 disabled:opacity-50 flex items-center justify-center gap-2"
            title={!webAuthnAvailable ? 'Biometrics not supported on this device' : label}
          >
            {IconSet}
            <span>{busy ? 'Checking…' : label}</span>
          </button>

          {!webAuthnAvailable && (
            <p className="text-[11px] text-white/40 mt-1">
              Biometrics requires a modern browser/device with passkeys (WebAuthn).
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
