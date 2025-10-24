// Run on Node and prevent static caching
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

const HOOK_SECRET =
  (process.env.SUPABASE_SMS_HOOK_SECRET || process.env.SUPABASE_SMS_HOOK_TOKEN || '').trim();
const AAKASH_KEY = (process.env.AAKASH_SMS_API_KEY || '').trim();

// DEBUG flags
const DEBUG = process.env.DEBUG_SMS_HOOK === '1';
// **Unconditional** bypass for diagnostics (TURN OFF AFTER TESTING!)
const ALLOW_ALL_BYPASS = process.env.ALLOW_ALL_BYPASS === '1';

function J(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function bearerVariants(secretShown: string): string[] {
  const out = new Set<string>();
  const s = secretShown.trim();
  if (!s) return [];
  out.add(s);                                // "v1,whsec_...."
  const noV1 = s.startsWith('v1,') ? s.slice(3) : s;
  out.add(noV1);                              // "whsec_...."
  const noWhsec = noV1.startsWith('whsec_') ? noV1.slice(6) : noV1;
  out.add(noWhsec);                           // base64 only
  return [...out];
}

function parseSigHeader(h: string | null) {
  if (!h) return { t: '', v1: '' };
  if (/^[0-9a-f]{64}$/i.test(h)) return { t: '', v1: h }; // just hex
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

// ---- GET: self-check -------------------------------------------------------
export async function GET() {
  return J(200, {
    ok: true,
    version: 'v6-bypass-all',
    expects: 'Signature or Bearer; TEMP bypass via ALLOW_ALL_BYPASS=1',
    runtime,
    DEBUG,
    ALLOW_ALL_BYPASS,
  });
}

// ---- POST ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // Read RAW body (needed for signature verification and for echoing)
  const raw = await req.text();

  // If unconditional bypass is enabled, immediately echo headers + body and proceed.
  // This guarantees we SEE what Supabase is actually sending.
  if (ALLOW_ALL_BYPASS) {
    const echo: Record<string, unknown> = {
      ok: true,
      bypass: 'ALLOW_ALL_BYPASS',
      saw_headers: {
        'x-supabase-webhook-signature':
          req.headers.get('x-supabase-webhook-signature') ||
          req.headers.get('x-webhook-signature') ||
          req.headers.get('x-signature') ||
          null,
        authorization: req.headers.get('authorization') || null,
        'user-agent': req.headers.get('user-agent') || null,
        host: req.headers.get('host') || null,
      },
      raw_body_len: raw.length,
    };

    // Try to parse; if it fails we still return echo for visibility
    let body: any = null;
    try { body = JSON.parse(raw); } catch {}
    const { recipient: rawRecipient, message } = extractPayload(body || {});
    let e164: string | null = null;
    if (rawRecipient) {
      e164 = rawRecipient.startsWith('+977') ? rawRecipient : toE164Nepal(rawRecipient);
    }

    // If we don’t have Aakash key or recipient yet, return echo only (200) so you can inspect headers in Supabase.
    if (!AAKASH_KEY || !e164 || !message || !/^\+9779[78]\d{8}$/.test(e164)) {
      return J(200, { ...echo, aakash_skipped: true, reason: 'missing AAKASH key or invalid payload', e164, message });
    }

    // Otherwise, go ahead and send to Aakash so you can receive a test SMS while bypass is on.
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
      let parsed: any = null;
      try { parsed = JSON.parse(txt); } catch {}
      return J(res.ok ? 200 : 502, { ...echo, aakash: parsed || txt.slice(0, 300) });
    } catch (e: any) {
      return J(502, { ...echo, error: e?.message || 'Failed to reach Aakash' });
    }
  }

  // Normal secured path (after bypass is turned OFF)
  if (!HOOK_SECRET) return J(500, { ok: false, error: 'Server missing SUPABASE_SMS_HOOK_SECRET/TOKEN' });
  if (!AAKASH_KEY)  return J(500, { ok: false, error: 'AAKASH_SMS_API_KEY missing' });

  const sigHeader =
    req.headers.get('x-supabase-webhook-signature') ||
    req.headers.get('x-webhook-signature') ||
    req.headers.get('x-signature');
  const sigOk = verifySignature(raw, HOOK_SECRET, sigHeader);

  let bearerOk = false;
  const auth = (req.headers.get('authorization') || '').trim();
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!sigOk && token) {
    bearerOk = bearerVariants(HOOK_SECRET).includes(token);
  }

  if (!sigOk && !bearerOk) {
    return J(401, {
      ok: false,
      error: 'Unauthorized: invalid signature or bearer',
      ...(DEBUG ? { diag: { haveSigHeader: !!sigHeader, haveAuthHeader: !!auth, tokenLen: token.length } } : {}),
    });
  }

  let body: any;
  try { body = JSON.parse(raw); }
  catch { return J(400, { ok: false, error: 'Invalid JSON body' }); }

  const { recipient: rawRecipient, message } = extractPayload(body);
  if (!rawRecipient || !message) {
    return J(400, { ok: false, error: 'Missing phone or message', shape_hint: Object.keys(body || {}) });
  }

  const e164 = rawRecipient.startsWith('+977') ? rawRecipient : toE164Nepal(rawRecipient);
  if (!e164 || !/^\+9779[78]\d{8}$/.test(e164)) {
    return J(400, { ok: false, error: 'Recipient must be +977 and start with 97/98', recipient: rawRecipient });
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
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch {}
    return J(res.ok ? 200 : 502, { ok: res.ok, aakash: parsed || txt.slice(0, 300) });
  } catch (e: any) {
    return J(502, { ok: false, error: e?.message || 'Failed to reach Aakash' });
  }
}
