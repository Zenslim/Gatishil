export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

// --- Env --------------------------------------------------------------------
const HOOK_SECRET = (process.env.SUPABASE_SMS_HOOK_SECRET || process.env.SUPABASE_SMS_HOOK_TOKEN || '').trim();
const AAKASH_KEY  = (process.env.AAKASH_SMS_API_KEY || '').trim();
const AAKASH_SENDER_ID = (process.env.AAKASH_SENDER_ID || '').trim(); // optional approved mask
const DEBUG = process.env.DEBUG_SMS_HOOK === '1';

// --- Utils ------------------------------------------------------------------
function J(status: number, body: Record<string, unknown>) { return NextResponse.json(body, { status }); }

function parseSigHeader(h: string | null) {
  if (!h) return { t: '', v1: '' };
  if (/^[0-9a-f]{64}$/i.test(h)) return { t: '', v1: h };
  let t = '', v1 = '';
  for (const p of h.split(',').map(s => s.trim())) {
    const [k, v] = p.split('=');
    if (k === 't') t = v || '';
    if (k === 'v1' || k === 'sha256' || k === 's') v1 = v || '';
  }
  return { t, v1 };
}
function verifySignature(raw: string, secretShown: string, header: string | null): boolean {
  if (!secretShown || !header) return false;
  const cleaned = secretShown.startsWith('v1,') ? secretShown.slice(3) : secretShown;
  const b64 = cleaned.startsWith('whsec_') ? cleaned.slice(6) : cleaned;
  const { v1 } = parseSigHeader(header);
  if (!v1) return false;
  let key: Buffer;
  try { key = Buffer.from(b64, 'base64'); } catch { return false; }
  const macHex = createHmac('sha256', key).update(raw, 'utf8').digest('hex');
  try { return timingSafeEqual(Buffer.from(macHex, 'hex'), Buffer.from(v1, 'hex')); } catch { return false; }
}
function bearerVariants(secretShown: string): string[] {
  const out = new Set<string>();
  const s = (secretShown || '').trim(); if (!s) return [];
  out.add(s);
  const noV1 = s.startsWith('v1,') ? s.slice(3) : s; out.add(noV1);
  const noWh = noV1.startsWith('whsec_') ? noV1.slice(6) : noV1; out.add(noWh);
  return [...out];
}
function extractPayload(b: any): { recipient?: string; message?: string } {
  const phone =
    b?.user?.phone ?? b?.recipient ?? b?.to ?? b?.phone ??
    (Array.isArray(b?.destinations) && b.destinations[0]?.to) ?? undefined;
  const otp = b?.sms?.otp ?? b?.otp ?? undefined;
  const message = b?.message ?? b?.content ?? b?.text ?? (otp ? `Your Gatishil Nepal code is ${otp}` : undefined);
  return { recipient: typeof phone === 'string' ? phone : undefined, message: typeof message === 'string' ? message : undefined };
}
function toE164Nepal(raw: string): string | null {
  const s = String(raw).trim();
  if (s.startsWith('+977')) return s;
  const digits = s.replace(/\D/g, '');
  if (/^9[78]\d{8}$/.test(digits)) return `+977${digits}`;
  return null;
}
function formEncode(obj: Record<string, string>): string {
  return Object.entries(obj).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

// --- GET probe --------------------------------------------------------------
export async function GET() {
  return J(200, {
    ok: true,
    version: 'v9-aakash-form',
    expects: 'Supabase signature or bearer; Aakash form-encoded',
    runtime,
  });
}

// --- POST handler -----------------------------------------------------------
export async function POST(req: NextRequest) {
  // Read RAW first (signature needs raw)
  const raw = await req.text();

  // 1) Auth (Supabase): verify signature if present, else allow Bearer with any canonical secret
  const sigHeader =
    req.headers.get('x-supabase-webhook-signature') ||
    req.headers.get('x-webhook-signature') ||
    req.headers.get('x-signature');
  const sigOk = verifySignature(raw, HOOK_SECRET, sigHeader);

  let bearerOk = false;
  const auth = (req.headers.get('authorization') || '').trim();
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!sigOk && token) bearerOk = bearerVariants(HOOK_SECRET).includes(token);

  if (!sigOk && !bearerOk) {
    return J(401, { ok: false, error: 'Unauthorized: invalid signature or bearer',
      ...(DEBUG ? { diag: { haveSigHeader: !!sigHeader, haveAuthHeader: !!auth, tokenLen: token.length } } : {}) });
  }

  // 2) Parse JSON
  let body: any; try { body = JSON.parse(raw); } catch { return J(400, { ok: false, error: 'Invalid JSON body' }); }

  // 3) Validate payload
  const { recipient: rawRecipient, message } = extractPayload(body);
  if (!rawRecipient || !message) return J(400, { ok: false, error: 'Missing phone or message' });

  const e164 = rawRecipient.startsWith('+977') ? rawRecipient : toE164Nepal(rawRecipient);
  if (!e164 || !/^\+9779[78]\d{8}$/.test(e164)) {
    return J(400, { ok: false, error: 'Recipient must be +977 and start with 97/98', recipient: rawRecipient });
  }
  const local10 = e164.replace('+977', ''); // Aakash wants 10-digit local

  if (!AAKASH_KEY) return J(500, { ok: false, error: 'AAKASH_SMS_API_KEY missing' });

  // 4) Build **form-encoded** body per Aakash v3 docs
  //    Required: auth_token, to (string), text
  //    Optional: from (mask) if your account needs it
  const payload: Record<string, string> = {
    auth_token: AAKASH_KEY,
    to: local10,                 // NOT an array
    text: message,
  };
  if (AAKASH_SENDER_ID) payload['from'] = AAKASH_SENDER_ID;

  try {
    const res = await fetch('https://sms.aakashsms.com/sms/v3/send', {
      method: 'POST',
      headers: {
        // Aakash examples use urlencoded form; keep Authorization too just-in-case
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${AAKASH_KEY}`,
      },
      body: formEncode(payload),
    });

    const txt = await res.text().catch(() => '');
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch { /* some tenants return plain text/HTML on success/error */ }

    if (!res.ok) {
      return J(502, {
        ok: false,
        error: `Aakash ${res.status}`,
        body: parsed ?? txt.slice(0, 800),
        sent: { to: local10, has_sender: !!AAKASH_SENDER_ID, content_type: 'application/x-www-form-urlencoded' },
      });
    }

    return J(200, {
      ok: true,
      aakash: parsed ?? txt.slice(0, 400),
      sent: { to: local10, has_sender: !!AAKASH_SENDER_ID, content_type: 'application/x-www-form-urlencoded' },
    });
  } catch (e: any) {
    return J(502, { ok: false, error: e?.message || 'Failed to reach Aakash' });
  }
}
