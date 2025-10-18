/**
 * Uses existing backend: /api/otp/send and /api/otp/verify
 * After verifying, waits for a client session, then writes httpOnly cookies via /api/auth/sync.
 */
import { waitForSession } from '@/lib/auth/waitForSession';
import { getSupabaseBrowser } from '@/lib/supabaseClient'; // project's primary browser singleton

export async function verifyOtpAndSync(args: any) {
  // 1) Verify via legacy verifier (kept as source of truth)
  const res = await fetch('/api/otp/verify', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok && res.status !== 202) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `OTP verify failed (${res.status})`);
  }

  // 2) Wait for client session
  const supabase = getSupabaseBrowser();
  const ready = await waitForSession(supabase, 20, 250);
  if (!ready) throw new Error('Session not ready. Please try again.');

  // 3) Write httpOnly cookies for server pages like /dashboard
  const sync = await fetch('/api/auth/sync', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ready),
  });
  if (!sync.ok) {
    const j = await sync.json().catch(() => ({}));
    throw new Error(j?.error || `Auth sync failed (${sync.status})`);
  }
}
