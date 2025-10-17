// app/join/JoinClient.tsx — Minimal, production-tight Join (Auth-only) → /onboard
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { verifyOtpAndSync } from '@/lib/auth/verifyOtpClient';
import { waitForSession } from '@/lib/auth/waitForSession';

async function waitForSupabaseSession(timeoutMs = 8000) {
  const delayMs = 250;
  const tries = Math.ceil(timeoutMs / delayMs);
  const ready = await waitForSession(supabase, tries, delayMs);
  if (!ready) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

function httpErr(res: Response, data: any) {
  return (data && (data.error || data.message || data.raw)) || `HTTP ${res.status}`;
}
async function safeJson(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await res.json(); } catch { return {}; }
  }
  const txt = await res.text().catch(() => '');
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}

function mkIdKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
async function safeFetch(url: string, init: RequestInit, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

// ---------- Client component ----------
function JoinClientBody() {

  const router = useRouter();
  const _params = useSearchParams(); // kept for potential future use

  const smsEnabled = process.env.NEXT_PUBLIC_AUTH_SMS_ENABLED === 'true';

  const [email, setEmail] = useState('');
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);

  const invalidEmail = email.trim() !== '' && !email.includes('@');

  // Boot: if already signed in, or returning via magic link
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // already authenticated? → go to /onboard
      const { data } = await supabase.auth.getSession();
      const sess = data?.session ?? null;
      if (sess) {
        router.replace('/onboard?src=join');
        return;
      }

      // handle magic-link return (hash params)
      const { hash, origin, pathname } = window.location;
      const hasAccessToken = !!hash && hash.includes('access_token=');
      if (!hasAccessToken) return;

      // wait for Supabase to hydrate the session from hash
      const session = await waitForSupabaseSession();
      if (!session) return;

      // strip hash, then continue to onboard
      const clean = new URL(`${origin}${pathname}`);
      window.history.replaceState({}, '', clean.toString());
      if (!cancelled) router.replace('/onboard?src=ml');
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function sendEmailOtp() {
    if (loading) return;
    const trimmed = email.trim();
    if (!trimmed || trimmed.indexOf('@') === -1) {
      setErr('SMS login is temporarily disabled. Enter your email for a 6-digit code or Magic Link.');
      return;
    }

    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const res = await safeFetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'x-idempotency-key': mkIdKey('email-otp-send'),
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ type: 'email', email: trimmed, mode: 'otp' }),
      });

      const data = await safeJson(res);
      if (!res.ok || data?.ok !== true) throw new Error(httpErr(res, data));

      setOtpSentTo(trimmed);
      setMsg('We sent a 6-digit code to your email (expires in 5 minutes).');
      setTimeout(() => otpInputRef.current?.focus(), 50);
    } catch (e: any) {
      setErr(e?.message || 'Could not send OTP. Please try again.');
      // eslint-disable-next-line no-console
      console.error('sendEmailOtp error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink() {
    if (magicLoading) return;
    const trimmed = email.trim();
    if (!trimmed || trimmed.indexOf('@') === -1) {
      setErr('SMS login is temporarily disabled. Enter your email for a 6-digit code or Magic Link.');
      return;
    }

    setErr(null);
    setMsg(null);
    setMagicLoading(true);

    try {
      const res = await safeFetch('/api/otp/send', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'x-idempotency-key': mkIdKey('email-magic-send'),
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({
          type: 'email',
          email: trimmed,
          mode: 'magic',
          redirectTo: `${window.location.origin}/onboard?src=join`,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok || data?.ok !== true) throw new Error(httpErr(res, data));

      setMsg('Check your email and tap the magic link. You will return here.');
    } catch (e: any) {
      setErr(e?.message || 'Could not send magic link.');
      // eslint-disable-next-line no-console
      console.error('sendMagicLink error:', e);
    } finally {
      setMagicLoading(false);
    }
  }

  async function verifyOtp() {
    if (!otpSentTo || loading) return;

    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      await verifyOtpAndSync({ type: 'email', email: otpSentTo, token: otp.trim() });
      router.push('/onboard?src=join');
    } catch (e: any) {
      setErr(e?.message || 'Invalid or expired code.');
      // eslint-disable-next-line no-console
      console.error('verifyOtp error:', e);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Render ----------
  return (
    <main className="min-h-dvh bg-black text-white">
      <header className="px-6 md:px-10 pt-10 pb-6">
        <span className="inline-block text-[10px] tracking-[0.2em] rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sky-300/80">
          GATISHILNEPAL.ORG
        </span>
        <h1 className="mt-3 text-4xl md:text-5xl font-extrabold leading-tight">
          Join the DAO Party<br className="hidden md:block" /> of the Powerless.
        </h1>
        <p className="mt-3 text-slate-300/90 max-w-2xl">
          Enter your email for a secure code or magic link. Once verified, we’ll guide you through onboarding.
        </p>
      </header>

      <section className="px-6 md:px-10 pb-16">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_0_60px_-20px_rgba(255,255,255,0.3)]">
          {!smsEnabled && invalidEmail && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-100">
              SMS login is temporarily disabled. Enter your email for a 6-digit code or Magic Link.
            </div>
          )}

          <label className="block text-xs text-slate-300/70 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (otpSentTo) {
                setOtpSentTo(null);
                setOtp('');
              }
            }}
            placeholder="Email (you@example.com)"
            className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 outline-none"
            aria-label="Email address"
          />
          <p className="text-[11px] text-slate-400 mt-2">
            We’ll email you a one-time code. SMS will be back soon.
          </p>

          {!otpSentTo ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={sendEmailOtp}
                disabled={loading || invalidEmail || !email.trim()}
                className="w-full sm:flex-1 px-4 py-3 rounded-2xl bg-emerald-400 text-black font-semibold disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send 6-digit code'}
              </button>
              <button
                onClick={sendMagicLink}
                disabled={magicLoading || invalidEmail || !email.trim()}
                className="w-full sm:flex-1 px-4 py-3 rounded-2xl border border-white/20 text-sm font-semibold text-white disabled:opacity-60"
              >
                {magicLoading ? 'Sending…' : 'Send Magic Link'}
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <label className="block text-xs text-slate-300/70 mb-1">
                Enter 6-digit code sent to <b>{otpSentTo}</b>
              </label>
              <input
                ref={otpInputRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onPaste={(e) => {
                  const s = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                  if (s) {
                    e.preventDefault();
                    setOtp(s);
                  }
                }}
                placeholder="••••••"
                className="w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 outline-none tracking-widest text-center"
                aria-label="One-time code"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={verifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="flex-1 px-4 py-3 rounded-2xl bg-white text-black font-semibold disabled:opacity-60"
                >
                  {loading ? 'Verifying…' : 'Verify & Continue'}
                </button>
                <button
                  onClick={() => {
                    setOtpSentTo(null);
                    setOtp('');
                    setMsg(null);
                    setErr(null);
                  }}
                  className="px-4 py-3 rounded-2xl border border-white/15"
                >
                  Change email
                </button>
              </div>
            </div>
          )}

          {!!msg && <p className="mt-4 text-xs text-emerald-300">{msg}</p>}
          {!!err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
        </div>
      </section>
    </main>
  );
}

// Default export wrapped in Suspense to satisfy App Router CSR bailout rules
export default function JoinClient() {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-black" />}>
      <JoinClientBody />
    </Suspense>
  );
}
