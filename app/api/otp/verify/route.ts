export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

type VerifyBody = {
  phone?: string;
  token?: string;
};

function normalizeNp(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s.startsWith('+977') && /(\+977)9[78]\d{8}$/.test(s)) return s;
  const digits = s.replace(/\D/g, '');
  if (/^9[78]\d{8}$/.test(digits)) return `+977${digits}`;
  if (/^9779[78]\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: cookieStore });

  let body: VerifyBody | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const phone = normalizeNp(body?.phone ?? null);
  const token = (body?.token ?? '').toString().trim();

  if (!phone || !token) {
    return NextResponse.json({ ok: false, error: 'Missing phone or token' });
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message });
    }

    // Cookies are set by the helper on success
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'verify failed' });
  }
}
