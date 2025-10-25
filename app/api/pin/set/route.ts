import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, getAdminClient } from '@/lib/supabaseServer';
import { genSalt, derivePasswordFromPin } from '@/lib/crypto/pin';

const ENABLE_TRUST_PIN = process.env.NEXT_PUBLIC_ENABLE_TRUST_PIN === 'true';

/**
 * POST /api/pin/set
 * Body: { pin: string }
 * Requires an active Supabase session cookie (created during join).
 * - Validates 4–8 digit PIN
 * - Upserts salt/kdf row in public.auth_local_pin (service role)
 * - Derives strong password with scrypt + PEPPER
 * - Updates Supabase auth user password via Admin API
 * - Does NOT rotate cookies; session remains valid
 */
export async function POST(req: NextRequest) {
  try {
    if (!ENABLE_TRUST_PIN) {
      return new NextResponse('Trust PIN feature disabled', { status: 404 });
    }

    const supabase = getServerClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new NextResponse('No session', { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const pin: string = String(body?.pin || '');

    if (!/^\d{4,8}$/.test(pin)) {
      return new NextResponse('Invalid PIN format', { status: 400 });
    }

    const pepper = process.env.PIN_PEPPER;
    if (!pepper || pepper.length < 16) {
      return new NextResponse('Server not configured (PIN_PEPPER)', { status: 500 });
    }

    const admin = getAdminClient();

    // Ensure table exists (optional safety: attempt create if missing? We keep it strict.)
    // Upsert salt row
    const salt = genSalt(16);
    const { derivedB64u } = derivePasswordFromPin({
      pin,
      userId: user.id,
      salt,
      pepper,
      length: 48,
    });

    // Persist salt & kdf metadata
    const { error: upsertErr } = await admin
      .from('auth_local_pin')
      .upsert({
        user_id: user.id,
        salt: salt.toString('base64'),
        kdf: 'scrypt-v1',
        pin_retries: 0,
        locked_until: null,
      })
      .eq('user_id', user.id);

    if (upsertErr) {
      return new NextResponse(`DB upsert failed: ${upsertErr.message}`, { status: 500 });
    }

    // Update Supabase auth password (admin)
    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      password: derivedB64u,
    });
    if (updErr) {
      return new NextResponse(`Auth update failed: ${updErr.message}`, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || 'Error', { status: 500 });
  }
}
