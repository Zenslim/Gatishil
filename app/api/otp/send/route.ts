export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

type SendBody = {
  email?: string;
  phone?: string;
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

  let body: SendBody | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const email = body?.email?.trim();
  const np = normalizeNp(body?.phone ?? null);

  try {
    if (email) {
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${site}/auth/callback` },
      });
      return NextResponse.json({ ok: true, email });
    }

    if (np) {
      await supabase.auth.signInWithOtp({
        phone: np,
        options: { channel: 'sms', shouldCreateUser: true },
      });
      return NextResponse.json({ ok: true, phone: np });
    }

    return NextResponse.json({ ok: false, error: 'Provide email or phone (+977…)' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'send failed' });
  }
}
