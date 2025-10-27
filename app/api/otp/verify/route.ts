// app/api/otp/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
  createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options: any) => {
        res.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: any) => {
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
    const body = (await req.json().catch(() => ({}))) as { phone?: string; token?: string };
    const phoneInput = (body.phone ?? '').trim();
    const token = String(body.token ?? '').trim();

    const phone = normalizePhone(phoneInput);
    if (!phone || !token) {
      return NextResponse.json({ error: 'Invalid phone or token' }, { status: 400 });
    }

    const res = new NextResponse(null, { status: 204 });
    const supabase = getSupabaseSSR(req, res);

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 });
    }

    return res; // 204 and cookies set on response
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
