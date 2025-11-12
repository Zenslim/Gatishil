// app/api/otp/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const normalizePhone = (raw: string) => {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('977')) return `+${digits}`;
  return `+977${digits}`;
};

const getSupabaseSSR = (req: NextRequest, res: NextResponse) =>
  createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        // write Set-Cookie onto the SAME response we will return
        res.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: CookieOptions) => {
        res.cookies.set({ name, value: '', ...options });
      },
    },
  });

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export function GET() {
  return new NextResponse('Use POST', { status: 405 });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      phone?: string;
      token?: string; // 6-digit OTP
    };

    const phone = normalizePhone(body.phone ?? '');
    const token = String(body.token ?? '').trim();

    if (!phone || !/^\d{4,8}$/.test(token)) {
      return NextResponse.json({ error: 'Invalid phone or token' }, { status: 400 });
    }

    // Attach cookies to THIS response instance
    const res = new NextResponse(null, { status: 204 });
    const supabase = getSupabaseSSR(req, res);

    // 1) Verify OTP on the server (should return a session)
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    // 2) Hard check: ensure a session exists before returning 204
    if (error) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
    }

    // Some SDK versions don’t finalize cookies until a read; force it:
    const { data: sessionProbe, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      return NextResponse.json({ error: 'Auth read failed' }, { status: 500 });
    }
    if (!data?.session && !sessionProbe?.session) {
      // No session realized => treat as invalid OTP
      return NextResponse.json({ error: 'No session after verify' }, { status: 401 });
    }

    // Success: cookies are now on `res`, client should redirect on 204
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
