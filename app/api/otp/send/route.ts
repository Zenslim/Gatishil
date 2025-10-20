import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeNepalMobile } from '@/lib/auth/phone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_AAKASH_SMS_BASE_URL = 'https://sms.aakashsms.com/sms/v3/send';

function respond(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

async function sendSms(
  phone: string,
  code: string,
  options: { apiKey: string; senderId: string; baseUrl?: string }
) {
  const { apiKey, senderId, baseUrl } = options;
  const message = `Your Gatishil code is ${code}. It expires in 5 minutes.`;
  const body = new URLSearchParams({
    key: apiKey,
    route: 'sms',
    sender: senderId,
    phone,
    text: message,
  });

  const res = await fetch(baseUrl || DEFAULT_AAKASH_SMS_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.status === 'error') {
    throw new Error(data?.message || 'Aakash SMS failed');
  }

  return message;
}

export async function POST(req: Request) {
  const {
    NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE,
    AAKASH_SMS_API_KEY,
    AAKASH_SMS_BASE_URL,
    AAKASH_SENDER_ID,
  } = process.env;

  if (
    (!SUPABASE_URL || (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE)) &&
    (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const siteUrl = (NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const supabaseUrl = NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
  const supabaseAnonKey = NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: 'Server auth not configured' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }

  const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const body = await req.json().catch(() => ({}));
  const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
  const rawPhone = typeof body.phone === 'string' ? body.phone : '';

  if (!rawEmail && !rawPhone) {
    return respond({ ok: false, message: 'Provide an email or phone number.' }, 400);
  }

  if (rawEmail) {
    try {
      const { error } = await supabasePublic.auth.signInWithOtp({
        email: rawEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined,
        },
      });
      if (error) throw error;
      return respond({ ok: true, channel: 'email' });
    } catch (error: any) {
      return respond({ ok: false, channel: 'email', message: error?.message || 'Could not send email OTP.' }, 400);
    }
  }

  const normalized = normalizeNepalMobile(rawPhone || '');
  if (!normalized) {
    return respond({
      ok: false,
      channel: 'sms',
      message: 'Phone OTP is Nepal-only. Enter +97798… or use email.',
    }, 400);
  }

  if (!AAKASH_SMS_API_KEY) {
    return new Response(JSON.stringify({ error: 'SMS gateway not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { data: recent } = await supabaseAdmin
    .from('otps')
    .select('id, created_at, status')
    .eq('phone', normalized)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recent && recent.length > 0) {
    const latest = recent[0];
    const created = new Date(latest.created_at).getTime();
    if (Date.now() - created < 60_000) {
      return respond({
        ok: false,
        channel: 'sms',
        message: 'Please wait 60 seconds before requesting another code.',
      }, 429);
    }
  }

  try {
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'otp',
      phone: normalized,
      options: {
        channel: 'sms',
        shouldCreateUser: true,
      },
    });
    if (error) throw error;

    const code = link?.properties?.phone_otp;
    if (!code || typeof code !== 'string') {
      throw new Error('Supabase did not issue an OTP code.');
    }

    await sendSms(normalized, code, {
      apiKey: AAKASH_SMS_API_KEY,
      senderId: AAKASH_SENDER_ID || 'GATISHIL',
      baseUrl: AAKASH_SMS_BASE_URL,
    });

    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const { error: insertError } = await supabaseAdmin.from('otps').insert({
      phone: normalized,
      code,
      expires_at: expiresAt,
      status: 'sent',
    });
    if (insertError) throw insertError;

    return respond({ ok: true, channel: 'sms', message: 'OTP sent via SMS. It expires in 5 minutes.' });
  } catch (error: any) {
    return respond({ ok: false, channel: 'sms', message: error?.message || 'Could not send SMS OTP.' }, 400);
  }
}
