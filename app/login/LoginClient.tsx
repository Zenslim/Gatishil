'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

/* ---------- minimal SVG icons (no extra deps) ---------- */
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

/** UA hint AFTER mount (prevents hydration mismatch) */
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

/* Base64URL helpers for WebAuthn */
const b64 = {
  toArrayBuffer: (value: string) => {
    const pad = '='.repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw = typeof window !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr.buffer;
  },
  fromArrayBuffer: (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = typeof window !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  },
};

/* Normalize server options into ArrayBuffers for navigator.credentials.get */
function normalizeRequestOptions(opts: any): PublicKeyCredentialRequestOptions {
  const out: any = { ...opts };
  if (typeof out.challenge === 'string') out.challenge = b64.toArrayBuffer(out.challenge);
  if (Array.isArray(out.allowCredentials)) {
    out.allowCredentials = out.allowCredentials.map((c: any) => ({
      ...c,
      id: typeof c.id === 'string' ? b64.toArrayBuffer(c.id) : c.id,
    }));
  }
  return out as PublicKeyCredentialRequestOptions;
}

/* Pack PublicKeyCredential into JSON your server can verify */
function packAssertionResponse(cred: any) {
  const { id, type, rawId, response } = cred;
  return {
    id,
    type,
    rawId: b64.fromArrayBuffer(rawId),
    response: {
      clientDataJSON: b64.fromArrayBuffer(response.clientDataJSON),
      authenticatorData: b64.fromArrayBuffer(response.authenticatorData),
      signature: b64.fromArrayBuffer(response.signature),
      userHandle: response.userHandle ? b64.fromArrayBuffer(response.userHandle) : null,
    },
  };
}

/* ---------- component ---------- */
export default function LoginClient() {
  const q = useSearchParams();
  const next = q.get('next') || '/dashboard';

  const [user, setUser] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // hydration-safe flags
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const webAuthnAvailable =
    mounted && typeof window !== 'undefined' && 'PublicKeyCredential' in window;

  // neutral on SSR, specialize icon after mount
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

  /** Biometrics (WebAuthn) using YOUR existing API routes (no SDK dependency) */
  async function onBiometricLogin() {
    if (busy) return;
    const identifier = user.trim();
    if (!identifier) return setErr('Enter your email or phone first.');
    if (!webAuthnAvailable) return setErr('This device/browser does not support biometrics here.');

    setBusy(true);
    setErr(null);
    try {
      // 1) Get assertion challenge from server
      const challengeRes = await fetch('/api/webauthn/login/challenge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      if (!challengeRes.ok) {
        const t = await challengeRes.text().catch(() => '');
        throw new Error(t || 'Could not start biometric login.');
      }
      const options = await challengeRes.json(); // may be { publicKey: {...} } or raw options

      // 2) WebAuthn ceremony in browser
      const publicKey = normalizeRequestOptions(options?.publicKey ?? options);
      const cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;

      // 3) Send assertion to server for verification
      const verifyRes = await fetch('/api/webauthn/login/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          identifier,
          credential: packAssertionResponse(cred),
        }),
      });
      if (!verifyRes.ok) {
        const t = await verifyRes.text().catch(() => '');
        throw new Error(t || 'Biometric verification failed.');
      }

      // 4) Mirror SSR cookies so middleware/SSR see the session
      const sync = await fetch('/api/auth/sync', { method: 'POST', credentials: 'include' });
      if (!sync.ok) throw new Error('Session sync failed.');

      // 5) Redirect just like a correct PIN
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
        {/* --- Updated heading + subline --- */}
        <h1 className="text-2xl font-bold">Sign in to your Gatishil Movement account</h1>
        <p className="mt-2 text-sm text-slate-300/85">
          Not a member yet?{' '}
          <Link href="/join" className="underline underline-offset-4 hover:text-white">
            Join Us→ join
          </Link>
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
