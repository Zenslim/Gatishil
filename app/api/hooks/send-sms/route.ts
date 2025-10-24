export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const AAKASH_URL = process.env.AAKASH_SMS_BASE_URL || 'https://sms.aakashsms.com/sms/v4/send-user';
const AAKASH_KEY = (process.env.AAKASH_SMS_API_KEY || '').trim();
const AAKASH_SENDER_ID = (process.env.AAKASH_SENDER_ID || '').trim(); // optional
const DEBUG = process.env.DEBUG_SMS_HOOK === '1';

function J(body: Record<string, unknown>, status = 200) {
  // Always 200 to avoid breaking Supabase /auth/v1/otp
  return NextResponse.json(body, { status: 200 });
}

// ---------- Permissive extractors ----------
function pickPhone(b: any): string | undefined {
  const c = (v: any) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return (
    c(b?.user?.phone) ??
    c(b?.phone) ??
    c(b?.recipient) ??
    c(b?.to) ??
    c(Array.isArray(b?.to) ? b.to[0] : undefined) ??
    c(b?.record?.phone) ??
    c(b?.new?.phone) ??
    c(b?.data?.phone) ??
    (Array.isArray(b?.destinations) ? c(b.destinations[0]?.to) : undefined)
  );
}

function pickOtp(b: any): string | undefined {
  const raw =
    b?.sms?.otp ?? b?.otp ?? b?.code ??
    b?.record?.otp ?? b?.new?.otp ?? b?.data?.otp;
  if (raw == null) return undefined;
  return String(raw).trim();
}

function pickMessage(b: any, otp?: string): string | undefined {
  const c = (v: any) => (typeof v === 'string' && v.trim() ? v : undefined);
  return (
    c(b?.message) ??
    c(b?.content) ??
    c(b?.text) ??
    (otp ? `Your Gatishil Nepal code is ${otp}` : undefined)
  );
}

function toE164Nepal(raw: string): string | null {
  const s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith('+977')) return s;
  const digits = s.replace(/\D/g, '');
  if (/^9[78]\d{8}$/.test(digits)) return `+977${digits}`;
  return null;
}

function toAakashLocal(e164: string): string | null {
  if (!e164.startsWith('+977')) return null;
  const local = e164.slice(4);
  return /^98\d{8}$/.test(local) ? local : null;
}

// ---------- GET: version probe ----------
export async function GET() {
  return J({
    ok: true,
    version: 'v10-permissive-aakash-v4',
    behavior: 'Always 200; Aakash v4 JSON + auth-token; wide extractor',
    runtime: 'nodejs',
  });
}

// ---------- POST: never 4xx to Supabase ----------
export async function POST(req: NextRequest) {
  let raw = '';
  try { raw = await req.text(); } catch {}
  let body: any = null;
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

  const otp = pickOtp(body);
  const rawPhone = pickPhone(body);
  const e164 = rawPhone ? (rawPhone.startsWith('+977') ? rawPhone : toE164Nepal(rawPhone)) : null;
  const local10 = e164 ? toAakashLocal(e164) : null;
  const message = pickMessage(body, otp);

  // If we’re missing essentials, return 200 with diagnostics (don’t break Supabase)
  if (!rawPhone || !e164 || !/^\+9779[78]\d{8}$/.test(e164) || !local10 || !message) {
    return J({
      ok: false,
      reason: 'payload_incomplete',
      diag: DEBUG ? {
        havePhone: !!rawPhone,
        e164,
        local10,
        haveMsg: !!message,
        otp,
        keys: Object.keys(body || {}),
      } : undefined
    });
  }

  if (!AAKASH_KEY) {
    return J({
      ok: false,
      reason: 'aakash_key_missing',
      diag: DEBUG ? { env: 'AAKASH_SMS_API_KEY missing' } : undefined,
    });
  }

  const payload: Record<string, any> = { to: [local10], text: [message] };
  if (AAKASH_SENDER_ID) payload.from = AAKASH_SENDER_ID;

  try {
    const res = await fetch(AAKASH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Aakash v4 expects this header name:
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
