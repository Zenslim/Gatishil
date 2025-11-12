// app/api/otp/send/route.ts
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
    const body = (await req.json().catch(() => ({}))) as { phone?: string };
    const phoneInput = (body.phone ?? '').trim();
    const phone = normalizePhone(phoneInput);
    if (!phone) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
    }

    const res = new NextResponse(null, { status: 204 });
    const supabase = getSupabaseSSR(req, res);

    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      // Common: rate limits or invalid phone -> 400/429 style mapping
      const msg = String(error.message || 'OTP send failed');
      const status = /rate|limit/i.test(msg) ? 429 : 400;
      return NextResponse.json({ error: msg }, { status });
    }

    return res; // 204
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
