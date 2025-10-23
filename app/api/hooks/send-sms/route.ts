// Run on Node so we can read process.env and access crypto
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

// Accept either name; value must be EXACTLY the "Secret" shown in Supabase (e.g., v1,whsec_...)
const HOOK_SECRET =
  (process.env.SUPABASE_SMS_HOOK_SECRET || process.env.SUPABASE_SMS_HOOK_TOKEN || '').trim();

// Aakash bearer key
const AAKASH_KEY = (process.env.AAKASH_SMS_API_KEY || '').trim();

// Optional debug (set DEBUG_SMS_HOOK=1 in Vercel while testing)
const DEBUG = process.env.DEBUG_SMS_HOOK === '1';

function J(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

/**
 * Supabase HTTPS hooks now POST with a signature header computed from the raw body.
 * Header can be one of:
 *   - X-Supabase-Webhook-Signature
 *   - X-Webhook-Signature        (older)
 * The value often looks like: "t=...,v1=<hex-hmac>"
 * We verify HMAC-SHA256(rawBody, secretBytes) equals v1.
 */
function parseSigHeader(h: string | null) {
  if (!h) return { t: '', v1: '' };
  // simple parser: split comma items into key=value
  const parts = h.split(',').map((s) => s.trim());
  let t = '';
  let v1 = '';
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k === 't') t = v || '';
    if (k === 'v1' || k === 'sha256' || k === 's') v1 = v || '';
  }
  // if header is just the hex string, accept it
  if (!v1 && /^[0-9a-f]{64}$/i.test(h)) v1 = h;
  return { t, v1 };
}

function verifySignature(raw: string, secretB64: string, header: string | null): boolean {
  // Secret from Supabase UI starts with "v1,whsec_..." (base64). Strip the prefix "v1," if present.
  const cleaned = secretB64.startsWith('v1,') ? secretB64.slice(3) : secretB64;
  const sig = parseSigHeader(header);
  if (!sig.v1) return false;

  // Base64 decode secret and compute HMAC
  let key: Buffer;
  try {
    const b64 = cleaned.startsWith('whsec_') ? cleaned.slice('whsec_'.length) : cleaned;
    key = Buffer.from(b64, 'base64');
  } catch {
    return false;
  }

  const mac = createHmac('sha256', key).update(raw, 'utf8').digest('hex');
  try {
    return timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(sig.v1, 'hex'));
  } catch {
    return false;
  }
}

// Try to pull phone and message/otp from several shapes
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

function toE164Nepal(raw: string): string | null {
  const s = String(raw).trim();
  if (s.startsWith('+977')) return s;
  const digits = s.replace(/\D/g, '');
  if (/^9[78]\d{8}$/.test(digits)) return `+977${digits}`;
  return null;
}

export async function POST(req: NextRequest) {
  if (!HOOK_SECRET) return J(500, { ok: false, error: 'Server missing SUPABASE_SMS_HOOK_SECRET/TOKEN' });
  if (!AAKASH_KEY)  return J(500, { ok: false, error: 'AAKASH_SMS_API_KEY missing' });

  // 1) Read RAW body for signature verification
  const raw = await req.text();

  // 2) Verify Supabase signature (primary)
  const sigHeader =
    req.headers.get('x-supabase-webhook-signature') ||
    req.headers.get('x-webhook-signature') ||
    req.headers.get('x-signature');
  const sigOk = verifySignature(raw, HOOK_SECRET, sigHeader);

  // 3) OPTIONAL fallback: if you previously used Authorization: Bearer <token>
  //    accept it only if signature is missing AND token matches exactly.
  let bearerOk = false;
  if (!sigOk) {
    const auth = (req.headers.get('authorization') || '').trim();
    if (auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim();
      // token must equal the exact HOOK_SECRET string
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

  // 4) Parse JSON
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return J(400, { ok: false, error: 'Invalid JSON body' });
  }

  const { recipient: rawRecipient, message } = extract(body);
  if (!rawRecipient || !message) {
    return J(400, { ok: false, error: 'Missing phone or message', shape_hint: Object.keys(body || {}) });
  }

  const e164 = rawRecipient.startsWith('+977') ? rawRecipient : toE164Nepal(rawRecipient);
  if (!e164) return J(400, { ok: false, error: 'Recipient not Nepal +977 97/98', recipient: rawRecipient });
  if (!/^\+9779[78]\d{8}$/.test(e164)) {
    return J(400, { ok: false, error: 'Recipient must be +97797/98 followed by 8 digits', recipient: e164 });
  }

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
