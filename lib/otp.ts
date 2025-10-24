import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';

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

  const payload = emailSendSchema.parse(await req.json());
  const { error } = await supabase.auth.signInWithOtp({
    email: payload.email,
    options: {
      emailRedirectTo: payload.redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    await supabase.commitCookies(res);
    return json(res, { ok: false, error: error.message }, 400);
  }

  await supabase.commitCookies(res);
  return json(res, { ok: true, channel: 'email', mode: payload.type ?? 'otp' });
}

export async function handleSendPhone(req: Request) {
  const res = new NextResponse();
  const supabase = getSupabaseServer({ response: res });

  const payload = phoneSendSchema.parse(await req.json());
  const { error } = await supabase.auth.signInWithOtp({ phone: payload.phone });

  if (error) {
    await supabase.commitCookies(res);
    return json(res, { ok: false, error: error.message }, 400);
  }

  await supabase.commitCookies(res);
  return json(res, { ok: true, channel: 'phone', mode: 'sms' });
}

export async function handleVerifyEmail(req: Request) {
  const res = new NextResponse();
  const supabase = getSupabaseServer({ response: res });

  const payload = emailVerifySchema.parse(await req.json());
  const { data, error } = await supabase.auth.verifyOtp({
    email: payload.email,
    token: payload.token,
    type: 'email',
  });

  if (error || !data.session) {
    await supabase.commitCookies(res);
    return json(res, { ok: false, error: error?.message || 'invalid_code' }, 400);
  }

  await supabase.commitCookies(res);
  return json(res, { ok: true, channel: 'email', user: data.user, session: data.session });
}

export async function handleVerifyPhone(req: Request) {
  const res = new NextResponse();
  const supabase = getSupabaseServer({ response: res });

  const payload = phoneVerifySchema.parse(await req.json());
  const { data, error } = await supabase.auth.verifyOtp({
    phone: payload.phone,
    token: payload.token,
    type: 'sms',
  });

  if (error || !data.session) {
    await supabase.commitCookies(res);
    return json(res, { ok: false, error: error?.message || 'invalid_code' }, 400);
  }

  await supabase.commitCookies(res);
  return json(res, { ok: true, channel: 'phone', user: data.user, session: data.session });
}

export function normalizeNepalPhone(input: string) {
  const raw = input.replace(/\s|-/g, '');
  if (raw.startsWith('+977')) return raw;
  if (raw.startsWith('977')) return '+' + raw;
  if (raw.startsWith('98') || raw.startsWith('97')) return '+977' + raw;
  return raw;
}

function json(res: NextResponse, body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...Object.fromEntries(res.headers),
    },
  });
}
