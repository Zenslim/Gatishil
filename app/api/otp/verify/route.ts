import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify 6-digit code for Nepal numbers
export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();
    if (!phone || !code)
      return NextResponse.json({ ok: false, error: 'Missing phone or code' });

    const { data: rows, error } = await supabase
      .from('otps')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !rows?.length)
      return NextResponse.json({ ok: false, error: 'Code not found' });

    const otp = rows[0];
    const age = (Date.now() - new Date(otp.created_at).getTime()) / 60000;
    if (age > 5) return NextResponse.json({ ok: false, error: 'Code expired' });
    if (otp.code !== code)
      return NextResponse.json({ ok: false, error: 'Invalid code' });

    await supabase.from('otps').update({ used_at: new Date().toISOString() }).eq('id', otp.id);

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
