import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify 6-digit code with 5-attempt soft lock (2 minutes)
export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code)
      return NextResponse.json({ ok: false, error: 'Missing phone or code' });

    // Check lock status
    const { data: attempt } = await supabase
      .from('otp_attempts')
      .select('fail_count, locked_until')
      .eq('phone', phone)
      .maybeSingle();

    const now = Date.now();
    if (attempt?.locked_until) {
      const until = new Date(attempt.locked_until).getTime();
      if (until > now) {
        return NextResponse.json({ ok: false, error: 'LOCKED' }, { status: 423 });
      }
    }

    // Get latest OTP
    const { data: rows, error } = await supabase
      .from('otps')
      .select('id, code, created_at')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !rows?.length)
      return NextResponse.json({ ok: false, error: 'Code not found' });

    const otp = rows[0];
    const age = (Date.now() - new Date(otp.created_at).getTime()) / 60000;
    if (age > 5) return NextResponse.json({ ok: false, error: 'Code expired' });

    if (otp.code !== code) {
      const fails = (attempt?.fail_count ?? 0) + 1;
      // lock for 2 minutes after 5 fails
      if (fails >= 5) {
        await supabase.from('otp_attempts')
          .upsert({ phone, fail_count: 0, locked_until: new Date(now + 2 * 60_000).toISOString() }, { onConflict: 'phone' });
        return NextResponse.json({ ok: false, error: 'LOCKED' }, { status: 423 });
      } else {
        await supabase.from('otp_attempts')
          .upsert({ phone, fail_count: fails, locked_until: null }, { onConflict: 'phone' });
        return NextResponse.json({ ok: false, error: 'INVALID' }, { status: 400 });
      }
    }

    // Success
    await supabase.from('otps').update({ used_at: new Date().toISOString() }).eq('id', otp.id);
    // reset attempts on success
    await supabase.from('otp_attempts').upsert({ phone, fail_count: 0, locked_until: null }, { onConflict: 'phone' });

    const { data: userData, error: authErr } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });
    if (authErr) throw authErr;

    return NextResponse.json({ ok: true, user: userData.user });
  } catch (err) {
    console.error('OTP verify failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Verification failed' },
      { status: 503 }
    );
  }
}
