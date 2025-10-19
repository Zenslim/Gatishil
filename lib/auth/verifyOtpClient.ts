import { waitForSession } from '@/lib/auth/waitForSession';
import { getSupabaseBrowser } from '@/lib/supabaseClient';

type VerifyArgs = {
  phone?: string;
  email?: string;
  code: string;
};

function readError(data: any, fallback: string) {
  if (!data) return fallback;
  if (typeof data.error === 'string' && data.error) return data.error;
  if (typeof data.message === 'string' && data.message) return data.message;
  return fallback;
}

export async function verifyOtpAndSync(args: VerifyArgs) {
  const phone = typeof args.phone === 'string' ? args.phone.trim() : undefined;
  const email = typeof args.email === 'string' ? args.email.trim() : undefined;
  const identifier = phone || email;
  if (!identifier) {
    throw new Error('Missing email or phone.');
  }
  if (!args.code || args.code.length !== 6) {
    throw new Error('Enter a valid 6-digit code.');
  }

  const res = await fetch('/api/otp/verify', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      phone: phone ?? null,
      email: email ?? null,
      code: args.code,
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload?.ok !== true) {
    throw new Error(readError(payload, `OTP verify failed (${res.status})`));
  }

  const supabase = getSupabaseBrowser();

  if (phone) {
    const { error } = await supabase.auth.verifyOtp({
      type: 'sms',
      phone,
      token: args.code,
    });
    if (error) throw error;
  } else if (email) {
    const { error } = await supabase.auth.verifyOtp({
      type: 'email',
      email,
      token: args.code,
    });
    if (error) throw error;
  }

  const session = await waitForSession(supabase, 20, 250);
  if (!session) throw new Error('Session not ready. Please try again.');

  const sync = await fetch('/api/auth/sync', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(session),
  });

  if (!sync.ok) {
    const data = await sync.json().catch(() => ({}));
    throw new Error(readError(data, `Auth sync failed (${sync.status})`));
  }
}
