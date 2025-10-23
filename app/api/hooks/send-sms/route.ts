// Run on Node so process.env is available
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

// Accept either env name so you don't have to rename your variable
const HOOK_SECRET =
  (process.env.SUPABASE_SMS_HOOK_SECRET || process.env.SUPABASE_SMS_HOOK_TOKEN || '').trim();

// Aakash bearer key
const AAKASH_KEY = (process.env.AAKASH_SMS_API_KEY || '').trim();

// Optional debug: set DEBUG_SMS_HOOK=1 in Vercel to get non-sensitive diagnostics
const DEBUG = process.env.DEBUG_SMS_HOOK === '1';

// Small helper to JSON-respond
function J(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

// Pull phone + message from multiple possible shapes
function extract(b: any): { recipient?: string; message?: string } {
  const phone =
    b?.user?.phone ??
    b?.recipient ??
    b?.to ??
    b?.phone ??
    (Array.isArray(b?.destinations) && b.destinations[0]?.to) ??
    undefined;

  const otp = b?.sms?.otp ?? b?.otp ?? undefined;

  const message =
    b?.message ??
    b?.content ??
    b?.text ??
    (otp ? `Your Gatishil Nepal code is ${otp}` : undefined);

  return {
    recipient: typeof phone === 'string' ? phone : undefined,
    message: typeof message === 'string' ? message : undefined,
  };
}

// Normalize local 97/98 -> +97797/98
function toE164Nepal(raw: string): string | null {
  const s = String(raw).trim();
  if (s.startsWith('+977')) return s;
  const digits = s.replace(/\D/g, '');
  if (/^9[78]\d{8}$/.test(digits)) return `+977${digits}`;
  return null;
}

// Get token from headers (Authorization: Bearer ... or X-Auth-Token: ...)
function getIncomingToken(req: NextRequest): string {
  const auth = (req.headers.get('authorization') || '').trim();
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const alt = (req.headers.get('x-auth-token') || '').trim();
  return alt;
}

export async function POST(req: NextRequest) {
  // Env guards
  if (!HOOK_SECRET) return J(500, { ok: false, error: 'Server missing SUPABASE_SMS_HOOK_SECRET/TOKEN' });
  if (!AAKASH_KEY) return J(500, { ok: false, error: 'AAKASH_SMS_API_KEY missing' });

  // Auth
  const incomingToken = getIncomingToken(req);
  if (incomingToken !== HOOK_SECRET) {
    // In debug we expose harmless diagnostics (no secrets)
    if (DEBUG) {
      return J(401, {
        ok: false,
        error: 'Hook requires authorization token',
        diag: {
          haveAuthHeader: !!req.headers.get('authorization'),
          haveXAuthHeader: !!req.headers.get('x-auth-token'),
          // reveal only lengths & hashes of empty strings (safe)
          incomingLen: incomingToken.length,
          secretLen: HOOK_SECRET.length,
          note: 'Trim spaces/newlines; token must match EXACTLY. Set same string in Vercel env and Supabase Hook header.',
        },
      });
    }
    return J(401, { ok: false, error: 'Hook requires authorization token' });
  }

  // Body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return J(400, { ok: false, error: 'Invalid JSON body' });
  }

  const { recipient: rawRecipient, message } = extract(body);
  if (!rawRecipient || !message) {
    return J(400, { ok: false, error: 'Missing phone or message', shape_hint: Object.keys(body || {}) });
  }

  // Ensure Nepal +977 97/98
  const e164 = rawRecipient.startsWith('+977') ? rawRecipient : toE164Nepal(rawRecipient);
  if (!e164) return J(400, { ok: false, error: 'Recipient not Nepal +977 97/98', recipient: rawRecipient });
  if (!/^\+9779[78]\d{8}$/.test(e164)) {
    return J(400, { ok: false, error: 'Recipient must be +97797/98 followed by 8 digits', recipient: e164 });
  }

  // Send to Aakash (expects local 98/97 without +977)
  const local = e164.replace('+977', '');
  try {
    const res = await fetch('https://sms.aakashsms.com/sms/v3/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AAKASH_KEY}`,
      },
      body: JSON.stringify({ to: [local], text: message }),
    });

    const txt = await res.text().catch(() => '');
    if (!res.ok) {
      return J(502, { ok: false, error: `Aakash ${res.status}`, body: txt.slice(0, 300) });
    }

    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch {}
    return J(200, { ok: true, aakash: parsed || txt.slice(0, 200) });
  } catch (e: any) {
    return J(502, { ok: false, error: e?.message || 'Failed to reach Aakash' });
  }
}
