// Facade kept for future throttling or SMS channel customization.
// For now, the pages call supabase.auth directly. We expose this route so we can
// pivot later without UI changes. Do not remove Aakash settings.
import { NextResponse } from 'next/server';
import { isEmail, isPhone } from '@/lib/auth/validate';
import { canSendOtp } from '@/lib/auth/rateLimit';

export async function POST(req: Request) {
  try {
    const { identifier } = await req.json();
    if (typeof identifier !== 'string') {
      return NextResponse.json({ ok: true }, { status: 200 }); // generic
    }

    const id = identifier.trim();
    const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
    const key = `otp:${id}:${ip}`;

    if (!isEmail(id) && !isPhone(id)) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!canSendOtp(key)) {
      return NextResponse.json({ ok: true }, { status: 200 }); // generic throttle response
    }

    // No-op for now; UI calls Supabase directly. We keep this endpoint for upgrades.
    // Preserve Aakash envs; do not delete or modify them.

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
