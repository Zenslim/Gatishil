// app/api/otp/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const normalizePhone = (raw: string) => {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('977')) return `+${digits}`;
  return `+977${digits}`;
};

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
    const supabase = getSupabaseServer({ request: req, response: res });

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
