// Force Node runtime and disable static caching
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

// ---- CONFIG (from Vercel env) ---------------------------------------------
// Paste the SAME value you see in Supabase's "Secret" box (e.g. "v1,whsec_....")
const HOOK_SECRET =
  (process.env.SUPABASE_SMS_HOOK_SECRET || process.env.SUPABASE_SMS_HOOK_TOKEN || '').trim();

// Aakash bearer token
const AAKASH_KEY = (process.env.AAKASH_SMS_API_KEY || '').trim();

// Optional debug: set DEBUG_SMS_HOOK=1 in Vercel while testing
const DEBUG = process.env.DEBUG_SMS_HOOK === '1';

// ---- HELPERS ---------------------------------------------------------------
function J(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function parseSigHeader(h: string | null) {
  if (!h) return { t: '', v1: '' };
  // Header can be "t=...,v1=<hex>" OR just "<hex>"
  if (/^[0-9a-f]{64}$/i.test(h)) return { t: '', v1: h };
  let t = '', v1 = '';
  for (const part of h.split(',').map(s => s.trim())) {
    const [k, v] = part.split('=');
    if (k === 't') t = v || '';
    if (k === 'v1' || k === 'sha256' || k === 's') v1 = v || '';
  }
  return { t, v1 };
}

// Supabase UI shows a secret like "v1,whsec_...." (base64 after "whsec_")
function verifySignature(raw: string, secretShown: string, header: string | null): boolean {
  if (!secretShown) return false;
  const cleaned = secretShown.startsWith('v1,') ? secretShown.slice(3) : secretShown;
  const b64 = cleaned.startsWith('whsec_') ? cleaned.slice(6) : cleaned;

  const { v1 } = parseSigHeader(header);
  if (!v1) return false;

  let key: Buffer;
  try { key = Buffer.from(b64, 'base64'); } catch { return false; }

  const macHex = createHmac('sha256', key).update(raw, 'utf8').digest('hex');
  try {
    return timingSafeEqual(Buffer.from(macHex, 'hex'), Buffer.from(v1, 'hex'));
  } catch {
    return false;
  }
}

function extractPayload(b: any): { recipient?: string; message?: string } {
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

function toE164Nepal(raw: string): string | null {
  const s = String(raw).trim();
  if (s.startsWith('+977')) return s;
  const digits = s.replace(/\D/g, '');
  if (/^9[78]\d{8}$/.test(digits)) return `+977${digits}`;
  return null;
}

// ---- GET: lightweight self-check so you know the right code is live --------
export async function GET() {
  return J(200, { ok: true, version: 'v3-signature', expects: 'X-Supabase-Webhook-Signature', runtime });
}

// ---- POST: Supabase hook handler ------------------------------------------
export async function POST(req: NextRequest) {
  if (!HOOK_SECRET) return J(500, { ok: false, error: 'Server missing SUPABASE_SMS_HOOK_SECRET/TOKEN' });
  if (!AAKASH_KEY)  return J(500, { ok: false, error: 'AAKASH_SMS_API_KEY missing' });

  // 1) must read RAW body to verify signature
  const raw = await req.text();

  // 2) verify Supabase signature (no custom headers needed)
  const sigHeader =
    req.headers.get('x-supabase-webhook-signature') ||
    req.headers.get('x-webhook-signature') ||
    req.headers.get('x-signature');

  const sigOk = verifySignature(raw, HOOK_SECRET, sigHeader);

  // BACKSTOP (only for legacy migrations): allow Bearer = HOOK_SECRET if no signature present.
  let bearerOk = false;
  if (!sigOk) {
    const auth = (req.headers.get('authorization') || '').trim();
    if (auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim();
      bearerOk = token === HOOK_SECRET;
    }
  }

  if (!sigOk && !bearerOk) {
    return J(401, {
      ok: false,
      error: 'Unauthorized: invalid or missing Supabase hook signature',
      ...(DEBUG ? { diag: { haveSigHeader: !!sigHeader, haveAuthHeader: !!req.headers.get('authorization') } } : {}),
    });
  }

  // 3) parse JSON after signature verification
  let body: any;
  try { body = JSON.parse(raw); }
  catch { return J(400, { ok: false, error: 'Invalid JSON body' }); }

  // 4) extract phone + message
  const { recipient: rawRecipient, message } = extractPayload(body);
  if (!rawRecipient || !message) {
    return J(400, { ok: false, error: 'Missing phone or message', shape_hint: Object.keys(body || {}) });
  }

  // 5) Nepal +977 97/98 only
  const e164 = rawRecipient.startsWith('+977') ? rawRecipient : toE164Nepal(rawRecipient);
  if (!e164) return J(400, { ok: false, error: 'Recipient not Nepal +977 97/98', recipient: rawRecipient });
  if (!/^\+9779[78]\d{8}$/.test(e164)) {
    return J(400, { ok: false, error: 'Recipient must be +97797/98 followed by 8 digits', recipient: e164 });
  }

  // 6) send via Aakash (expects local number)
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
    if (!res.ok) return J(502, { ok: false, error: `Aakash ${res.status}`, body: txt.slice(0, 300) });

    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch {}
    return J(200, { ok: true, aakash: parsed || txt.slice(0, 200) });
  } catch (e: any) {
    return J(502, { ok: false, error: e?.message || 'Failed to reach Aakash' });
  }
}
