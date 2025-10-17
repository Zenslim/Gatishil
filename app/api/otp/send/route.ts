// app/api/otp/send/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Sends an OTP (SMS/email code) or magic link.
 * Body (one of):
 *  - { type: 'sms', phone: '+977...' }
 *  - { type: 'email', email: 'user@example.com', mode: 'otp' | 'magic', redirectTo?: string }
 *
 * Notes:
 *  - For email 'magic', a magic-link is sent (verify later via { type:'email', token_hash }).
 *  - For email 'otp', a 6-digit code is sent (verify later via { type:'email', email, token }).
 *  - For SMS, a code is sent to the phone (verify via { type:'sms', phone, token }).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type: 'sms' | 'email' = body?.type;
    const phone: string | undefined = body?.phone;
    const email: string | undefined = body?.email;
    const mode: 'otp' | 'magic' = body?.mode ?? 'otp';
    const redirectTo: string | undefined = body?.redirectTo; // e.g. 'https://www.gatishilnepal.org/onboard?src=join'

    if (type !== 'sms' && type !== 'email') {
      return NextResponse.json({ ok: false, error: 'Invalid type' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 });
          },
        },
      }
    );

    if (type === 'sms') {
      if (!phone) return NextResponse.json({ ok:false, error:'Missing phone' }, { status:400 });
      const { error } = await supabase.auth.signInWithOtp({ phone, options: { channel: 'sms' } });
      if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 400 });
      return NextResponse.json({ ok:true });
    }

    // email branch
    if (!email) return NextResponse.json({ ok:false, error:'Missing email' }, { status:400 });

    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo ?? process.env.NEXT_PUBLIC_MAGIC_REDIRECT_URL ?? 'https://www.gatishilnepal.org/onboard?src=join',
          shouldCreateUser: true,
        },
      });
      if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 400 });
      return NextResponse.json({ ok:true, channel:'magic' });
    }

    // mode === 'otp'
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // emailRedirectTo can be omitted for code flow
      },
    });
    if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok:true, channel:'email_otp' });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error: e?.message || 'OTP send failed' }, { status: 500 });
  }
}
