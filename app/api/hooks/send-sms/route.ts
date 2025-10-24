export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

const HOOK_SECRET = (process.env.SUPABASE_SMS_HOOK_SECRET || process.env.SUPABASE_SMS_HOOK_TOKEN || '').trim();
const AAKASH_KEY = (process.env.AAKASH_SMS_API_KEY || '').trim();
const AAKASH_SENDER_ID = (process.env.AAKASH_SENDER_ID || '').trim(); // <-- NEW (e.g., "GATISHIL")
const DEBUG = process.env.DEBUG_SMS_HOOK === '1';
const ALLOW_ALL_BYPASS = process.env.ALLOW_ALL_BYPASS === '1'; // turn OFF (0) after testing

function J(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

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
  const s = (secretShown || '').trim();
  if (!s) return [];
  out.add(s);
  const noV1 = s.startsWith('v1,') ? s.slice(3) : s;
  out.add(noV1);
  const noWh = noV1.startsWith('whsec_') ? noV1.slice(6) : noV1;
  out.add(noWh);
  return [...out];
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

export async function GET() {
  return J(200, {
    ok: true,
    version: 'v8-aakash-sender',
    expects: 'Signature or Bearer; TEMP bypass via ALLOW_ALL_BYPASS=1',
    runtime,
  });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();

  // ---------- TEMP BYPASS FOR DIAG (turn off after testing) ----------
  if (ALLOW_ALL_BYPASS) {
    let body: any = null;
    try { body = JSON.parse(raw); } catch {}
    const { recipient: rawRecipient, message } = extractPayload(body || {});
    const e164 = rawRecipient ? (rawRecipient.startsWith('+977') ? rawRecipient : toE164Nepal(rawRecipient)) : null;
    const local = e164 ? e164.replace('+977', '') : null;

    const requestBody: Record<string, unknown> = {
      to: local ? [local] : [],
      text: message || '',
      auth_token: AAKASH_KEY,              // body token (some tenants require this)
    };
    if (AAKASH_SENDER_ID) requestBody['from'] = AAKASH_SENDER_ID; // <-- include sender if provided

    let aakash: any = { skipped: true, reason: 'missing inputs' };

    if (AAKASH_KEY && local && message && /^\+9779[78]\d{8}$/.test(e164!)) {
      try {
        const res = await fetch('https://sms.aakashsms.com/sms/v3/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AAKASH_KEY}`, // header token path
          },
          body: JSON.stringify(requestBody),
        });
        const txt = await res.text().catch(() => '');
        try { aakash = JSON.parse(txt); } catch { aakash = { status: res.status, body: txt.slice(0, 800) }; }
        aakash.status = res.status;
        aakash.ok = res.ok;
      } catch (e: any) {
        aakash = { ok: false, error: e?.message || 'Failed to reach Aakash' };
      }
    }

    return J(200, {
      ok: true,
      bypass: 'ALLOW_ALL_BYPASS',
      saw_env: { aakash_key_len: AAKASH_KEY.length, sender_id_len: AAKASH_SENDER_ID.length },
      saw_headers: {
        'x-supabase-webhook-signature':
          req.headers.get('x-supabase-webhook-signature') ||
          req.headers.get('x-webhook-signature') ||
          req.headers.get('x-signature') ||
          null,
        authorization: req.headers.get('authorization') || null,
        'content-type': req.headers.get('content-type') || null,
      },
      raw_body_len: raw.length,
      e164,
      aakash,
    });
  }
  // ---------- SECURE PATH (after bypass off) ----------
  if (!HOOK_SECRET) return J(500, { ok: false, error: 'Server missing SUPABASE_SMS_HOOK_SECRET/TOKEN' });
  if (!AAKASH_KEY) return J(500, { ok: false, error: 'AAKASH_SMS_API_KEY missing' });

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
    return J(401, { ok: false, error: 'Unauthorized: invalid signature or bearer' });
  }

  let body: any;
  try { body = JSON.parse(raw); } catch { return J(400, { ok: false, error: 'Invalid JSON body' }); }

  const { recipient: rawRecipient, message } = extractPayload(body);
  if (!rawRecipient || !message) return J(400, { ok: false, error: 'Missing phone or message' });

  const e164 = rawRecipient.startsWith('+977') ? rawRecipient : toE164Nepal(rawRecipient);
  if (!e164 || !/^\+9779[78]\d{8}$/.test(e164)) {
    return J(400, { ok: false, error: 'Recipient must be +977 and start with 97/98', recipient: rawRecipient });
  }

  const local = e164.replace('+977', '');
  const requestBody: Record<string, unknown> = {
    to: [local],
    text: message,
    auth_token: AAKASH_KEY,
  };
  if (AAKASH_SENDER_ID) requestBody['from'] = AAKASH_SENDER_ID;

  try {
    const res = await fetch('https://sms.aakashsms.com/sms/v3/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AAKASH_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });
    const txt = await res.text().catch(() => '');
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch {}
    return J(res.ok ? 200 : 502, { ok: res.ok, aakash: parsed || txt.slice(0, 800) });
  } catch (e: any) {
    return J(502, { ok: false, error: e?.message || 'Failed to reach Aakash' });
  }
}
