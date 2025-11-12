// app/api/otp/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

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
    const body = (await req.json().catch(() => ({}))) as { phone?: string };
    const phoneInput = (body.phone ?? '').trim();
    const phone = normalizePhone(phoneInput);
    if (!phone) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });
    }

    const supabase = supabaseServer();

    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      // Common: rate limits or invalid phone -> 400/429 style mapping
      const msg = String(error.message || 'OTP send failed');
      const status = /rate|limit/i.test(msg) ? 429 : 400;
      return NextResponse.json({ error: msg }, { status });
    }

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
