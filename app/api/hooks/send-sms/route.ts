export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const AAKASH_URL = process.env.AAKASH_SMS_BASE_URL || 'https://sms.aakashsms.com/sms/v4/send-user';
const AAKASH_KEY = (process.env.AAKASH_SMS_API_KEY || '').trim();
const AAKASH_SENDER_ID = (process.env.AAKASH_SENDER_ID || '').trim(); // optional mask
const DEBUG = process.env.DEBUG_SMS_HOOK === '1';

// Always 200 so Supabase /auth/v1/otp doesn't throw
function J(body: Record<string, unknown>) {
  return NextResponse.json(body, { status: 200 });
}

// ---------- Supabase-aware extractors ----------
function cleanStr(v: any): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function pickPhone(b: any): string | undefined {
  // 1) Our own test shape
  const p1 =
    cleanStr(b?.user?.phone) ??
    cleanStr(b?.phone) ??
    cleanStr(b?.recipient) ??
    cleanStr(b?.to) ??
    cleanStr(Array.isArray(b?.to) ? b.to[0] : undefined) ??
    cleanStr(b?.record?.phone) ??
    cleanStr(b?.new?.phone) ??
    cleanStr(b?.data?.phone) ??
    (Array.isArray(b?.destinations) ? cleanStr(b.destinations[0]?.to) : undefined);

  if (p1) return p1;

  // 2) Supabase Auth hook shape (what you posted in logs):
  //    auth_event.actor_username = "9779863935131" when provider == "phone"
  const provider = cleanStr(b?.auth_event?.traits?.provider);
  const actorUsername = cleanStr(b?.auth_event?.actor_username);
  if (provider === 'phone' && actorUsername) return actorUsername;

  // 3) Some Supabase variants may carry user.phone inside auth_event.user
  const p2 =
    cleanStr(b?.auth_event?.user?.phone) ??
    cleanStr(b?.auth_event?.record?.phone) ??
    cleanStr(b?.auth_event?.new?.phone);
  if (p2) return p2;

  return undefined;
}

function pickOtp(b: any): string | undefined {
  const raw =
    b?.sms?.otp ?? b?.otp ?? b?.code ??
    b?.record?.otp ?? b?.new?.otp ?? b?.data?.otp ??
    b?.auth_event?.otp ?? b?.auth_event?.code;
  if (raw == null) return undefined;
  return String(raw).trim();
}

function pickMessage(b: any, otp?: string): string | undefined {
  return (
    cleanStr(b?.message) ??
    cleanStr(b?.content) ??
    cleanStr(b?.text) ??
    cleanStr(b?.sms?.text) ??
    (otp ? `Your Gatishil Nepal code is ${otp}` : undefined)
  );
}

function toE164Nepal(raw: string): string | null {
  const s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith('+977')) return s;
  const digits = s.replace(/\D/g, '');
  if (/^9[78]\d{8}$/.test(digits)) return `+977${digits}`;
  // Some providers give "9779..." without plus
  if (/^9779[78]\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

function toAakashLocal(e164: string): string | null {
  if (!e164.startsWith('+977')) return null;
  const local = e164.slice(4);
  // Aakash v4 wants 98xxxxxxxx specifically (NTC/Ncell local)
  return /^9[78]\d{8}$/.test(local) ? local : null;
}

// ---------- GET: probe ----------
export async function GET() {
  return J({
    ok: true,
    version: 'v11-permissive-aakash-v4-supabase-aware',
    behavior: 'Always 200; extracts auth_event.actor_username; Aakash v4 JSON + auth-token',
    runtime: 'nodejs',
  });
}

// ---------- POST: never 4xx to Supabase ----------
export async function POST(req: NextRequest) {
  let raw = '';
  try { raw = await req.text(); } catch {}
  let body: any = null;
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

  const rawPhone = pickPhone(body);
  const otp = pickOtp(body);
  const msg = pickMessage(body, otp);

  // Normalize phone for Nepal
  let e164: string | null = null;
  if (rawPhone) {
    // If Supabase sends "9779863..." without +, fix to +977...
    const digits = rawPhone.replace(/\D/g, '');
    const normalized = rawPhone.startsWith('+') ? rawPhone : (digits.startsWith('977') ? `+${digits}` : rawPhone);
    e164 = normalized.startsWith('+977') ? normalized : toE164Nepal(normalized);
  }
  const local10 = e164 ? toAakashLocal(e164) : null;

  if (!AAKASH_KEY) {
    return J({
      ok: false, reason: 'aakash_key_missing',
      diag: DEBUG ? { env: 'AAKASH_SMS_API_KEY missing' } : undefined
    });
  }

  // If essentials are missing, still return 200 with diag (don’t break Supabase)
  if (!rawPhone || !e164 || !/^\+9779[78]\d{8}$/.test(e164) || !local10 || !msg) {
    return J({
      ok: false,
      reason: 'payload_incomplete',
      diag: DEBUG ? {
        havePhone: !!rawPhone,
        rawPhone,
        e164,
        local10,
        haveMsg: !!msg,
        otp,
        keys: Object.keys(body || {}),
        provider: body?.auth_event?.traits?.provider ?? null,
      } : undefined
    });
  }

  // Build Aakash v4 JSON payload exactly like your previously working route
  const payload: Record<string, any> = { to: [local10], text: [msg] };
  if (AAKASH_SENDER_ID) payload.from = AAKASH_SENDER_ID;

  try {
    const res = await fetch(AAKASH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // v4 uses "auth-token" header
        'auth-token': AAKASH_KEY,
      },
      body: JSON.stringify(payload),
    });

    const txt = await res.text().catch(() => '');
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch {}

    if (!res.ok) {
      return J({
        ok: false,
        reason: 'aakash_error',
        status: res.status,
        aakash: parsed ?? txt.slice(0, 800),
        sent: DEBUG ? payload : undefined,
      });
    }

    return J({
      ok: true,
      delivered: true,
      number: e164,
      aakash: parsed ?? txt.slice(0, 400),
    });
  } catch (e: any) {
    return J({
      ok: false,
      reason: 'aakash_exception',
      error: e?.message || 'Failed to reach Aakash v4',
    });
  }
}
