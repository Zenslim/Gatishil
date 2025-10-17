// app/api/otp/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Single source of truth for verifying OTP + Magic Link.
 * Body (one of):
 *  - { type: 'sms', phone: '+977...', token: '123456' }
 *  - { type: 'email', email: 'user@example.com', token: '123456' }
 *  - { type: 'email', token_hash: '...hash from magic link...' }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type: 'sms' | 'email' = body?.type;
    const phone: string | undefined = body?.phone;
    const email: string | undefined = body?.email;
    const token: string | undefined = body?.token;
    const token_hash: string | undefined = body?.token_hash;

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

    // Verify on server (writes httpOnly cookies once the session is available)
    const { error } = await supabase.auth.verifyOtp(
      type === 'sms'
        ? { type: 'sms', phone: phone!, token: token! }
        : token_hash
          ? { type: 'email', token_hash }
          : { type: 'email', email: email!, token: token! }
    );

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }

    // See if session is already issued
    const { data: sessionWrap } = await supabase.auth.getSession();
    const hasSession = !!sessionWrap?.session?.access_token;

    return NextResponse.json(
      { ok: true, status: hasSession ? 'ready' : 'pending' },
      { status: hasSession ? 200 : 202 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'OTP verification failed' },
      { status: 500 }
    );
  }
}
