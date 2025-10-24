import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';

/**
 * IMPORTANT
 * We must preserve ALL 'set-cookie' headers from Supabase after commitCookies(res).
 * Returning a brand new NextResponse without properly APPENDING those headers causes 500s
 * (and drops cookies for the next navigation).
 */
function send(resWithCookies: NextResponse, body: any, status = 200) {
  const out = NextResponse.json(body, { status });
  // Preserve every header set on the original response (notably multiple Set-Cookie)
  for (const [k, v] of resWithCookies.headers) {
    // Use append to keep multiple Set-Cookie values intact
    out.headers.append(k, v as string);
  }
  return out;
}

const emailSendSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  type: z.enum(['otp', 'magiclink']).default('otp').optional(),
  redirectTo: z.string().url().optional(),
});

const phoneSendSchema = z.object({
  phone: z.string().transform((s) => normalizeNepalPhone(s)),
});

const emailVerifySchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  token: z.string().min(6).max(6),
});

const phoneVerifySchema = z.object({
  phone: z.string().transform((s) => normalizeNepalPhone(s)),
  token: z.string().min(6).max(6),
});

export async function handleSendEmail(req: Request) {
  const res = new NextResponse();
  const supabase = getSupabaseServer({ response: res });

  let payload;
  try {
    payload = emailSendSchema.parse(await req.json());
  } catch (e: any) {
    await supabase.commitCookies(res);
    return send(res, { ok: false, error: 'bad_request' }, 400);
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: payload.email,
    options: {
      emailRedirectTo: payload.redirectTo,
      shouldCreateUser: true,
    },
  });

  await supabase.commitCookies(res);
  if (error) return send(res, { ok: false, error: error.message }, 400);

  return send(res, { ok: true, channel: 'email', mode: payload.type ?? 'otp' });
}

export async function handleSendPhone(req: Request) {
  const res = new NextResponse();
  const supabase = getSupabaseServer({ response: res });

  let payload;
  try {
    payload = phoneSendSchema.parse(await req.json());
  } catch (e: any) {
    await supabase.commitCookies(res);
    return send(res, { ok: false, error: 'bad_request' }, 400);
  }

  const { error } = await supabase.auth.signInWithOtp({ phone: payload.phone });

  await supabase.commitCookies(res);
  if (error) return send(res, { ok: false, error: error.message }, 400);

  return send(res, { ok: true, channel: 'phone', mode: 'sms' });
}

export async function handleVerifyEmail(req: Request) {
  const res = new NextResponse();
  const supabase = getSupabaseServer({ response: res });

  let payload;
  try {
    payload = emailVerifySchema.parse(await req.json());
  } catch {
    await supabase.commitCookies(res);
    return send(res, { ok: false, error: 'bad_request' }, 400);
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: payload.email,
    token: payload.token,
    type: 'email',
  });

  await supabase.commitCookies(res);
  if (error || !data.session) return send(res, { ok: false, error: error?.message || 'invalid_code' }, 400);

  return send(res, { ok: true, channel: 'email', user: data.user, session: data.session });
}

export async function handleVerifyPhone(req: Request) {
  const res = new NextResponse();
  const supabase = getSupabaseServer({ response: res });

  let payload;
  try {
    payload = phoneVerifySchema.parse(await req.json());
  } catch {
    await supabase.commitCookies(res);
    return send(res, { ok: false, error: 'bad_request' }, 400);
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: payload.phone,
    token: payload.token,
    type: 'sms',
  });

  await supabase.commitCookies(res);
  if (error || !data.session) return send(res, { ok: false, error: error?.message || 'invalid_code' }, 400);

  return send(res, { ok: true, channel: 'phone', user: data.user, session: data.session });
}

export function normalizeNepalPhone(input: string) {
  const raw = input.replace(/\s|-/g, '');
  if (raw.startsWith('+977')) return raw;
  if (raw.startsWith('977')) return '+' + raw;
  if (raw.startsWith('98') || raw.startsWith('97')) return '+977' + raw;
  return raw;
}
