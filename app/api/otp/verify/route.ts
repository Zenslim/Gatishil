import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeNepalMobile } from '@/lib/auth/phone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function respond(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: Request) {
  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE,
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

  const supabaseUrl = SUPABASE_URL ?? NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey =
    SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_SERVICE_ROLE ?? NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const phoneRaw = typeof body.phone === 'string' ? body.phone : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (code.length !== 6) {
    return respond({ ok: false, message: 'Invalid OTP code.' }, 400);
  }

  if (phoneRaw) {
    const normalized = normalizeNepalMobile(phoneRaw);
    if (!normalized) {
      return respond({ ok: false, message: 'Phone OTP is Nepal-only. Enter 96/97/98… (or +9779…) or use email.' }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('otps')
      .select('id, code, expires_at, status, attempts, created_at')
      .eq('phone', normalized)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return respond({ ok: false, message: 'Could not verify code right now.' }, 503);
    }

    if (!data || data.length === 0) {
      return respond({ ok: false, message: 'No active code found for this number.' }, 404);
    }

    const record = data[0];
    const expiresAt = new Date(record.expires_at).getTime();
    const now = Date.now();

    if (expiresAt < now) {
      await supabaseAdmin.from('otps').update({ status: 'expired' }).eq('id', record.id);
      return respond({ ok: false, message: 'This code expired. Please request a new one.' }, 410);
    }

    if (record.attempts >= 5) {
      return respond({ ok: false, message: 'Too many attempts. Request a new code.' }, 429);
    }

    if (record.code !== code) {
      await supabaseAdmin
        .from('otps')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id);
      return respond({ ok: false, message: 'Incorrect code. Try again.' }, 400);
    }

    await supabaseAdmin
      .from('otps')
      .update({ status: 'verified', attempts: record.attempts + 1 })
      .eq('id', record.id);

    return respond({ ok: true });
  }

  if (email) {
    // Email OTP verification happens client-side with Supabase; this endpoint just normalises the flow.
    return respond({ ok: true });
  }

  return respond({ ok: false, message: 'Missing identifier.' }, 400);
}
