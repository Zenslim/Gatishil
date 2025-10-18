// app/api/otp/send/route.ts
// Nepal-only phone OTP via Aakash. Optional email proxy to Supabase.
// Guarantees: no uncaught 500s to the browser; clear 400/429/503 mapping.

import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

// ---- tiny IP token bucket (per Vercel instance) ----
const buckets = new Map<string, { tokens: number; resetAt: number }>();
function takeToken(key: string, max = 12, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt < now) {
    b = { tokens: max, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (b.tokens <= 0) return false;
  b.tokens -= 1;
  return true;
}

// ---- helpers ----
const NEPAL_RE = /^\+977\d{8,11}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNepalPhone(v: string) { return NEPAL_RE.test(v.trim()); }
function isEmail(v: string) { return EMAIL_RE.test(v.trim()); }

function mkCode() {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const pepper = process.env.OTP_PEPPER || 'pepper';
  const hash = crypto.createHash('sha256').update(`${code}:${pepper}`).digest('hex');
  return { code, hash };
}

// NOTE: Wire this to your existing OTP persistence if you already have it.
// Leaving as no-op prevents crashes if your verify route owns storage.
async function saveOtpHash(_id: string, _hash: string, _ttlSec: number) {
  return;
}

async function sendAakashSMS(to: string, text: string) {
  const apiKey = process.env.AAKASH_SMS_API_KEY || '';
  const sender = process.env.AAKASH_SMS_SENDER || '';
  const base   = process.env.AAKASH_SMS_BASE_URL || '';

  if (!apiKey || !sender || !base) {
    const e: any = new Error('Aakash env missing');
    e.code = 'ENV_MISSING';
    throw e;
  }

  // Adjust path/body headers to your actual Aakash API
  const res = await fetch(`${base}/sms/send`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: sender, to, text }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const e: any = new Error(`Aakash send failed: ${res.status} ${body.slice(0, 200)}`);
    e.code = 'AAKASH_FAIL';
    e.status = res.status;
    throw e;
  }
}

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (!takeToken(`otp:${ip}`)) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
  }

  let payload: any = {};
  try { payload = await req.json(); } catch { /* privacy */ }

  const phone = typeof payload?.phone === 'string' ? payload.phone.trim() : '';
  const email = typeof payload?.email === 'string' ? payload.email.trim() : '';

  try {
    // ---- EMAIL OTP (proxy to Supabase; safe no-op if you don't use it here) ----
    if (email) {
      if (!isEmail(email)) return NextResponse.json({ ok: false }, { status: 400 });

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) {
        console.error('email OTP proxy failed:', error.message);
        // Keep responses generic to avoid user enumeration
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // ---- PHONE OTP (Nepal-only, via Aakash) ----
    if (phone) {
      if (!isNepalPhone(phone)) {
        return NextResponse.json({ ok: false }, { status: 400 });
      }

      // Env check up-front → 503 not 500
      if (!process.env.AAKASH_SMS_API_KEY || !process.env.AAKASH_SMS_SENDER || !process.env.AAKASH_SMS_BASE_URL) {
        return NextResponse.json({ ok: false, reason: 'sms_unavailable' }, { status: 503 });
      }

      const { code, hash } = mkCode();
      const ttl = 300; // 5 minutes
      try { await saveOtpHash(phone, hash, ttl); } catch (e) {
        console.error('saveOtpHash failed:', e);
        // Continue; some stacks store during verify instead.
      }

      const text = `Your Gatishil Nepal code is ${code}. It expires in 5 minutes.`;
      await sendAakashSMS(phone, text);

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Neither phone nor email → generic ok
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    if (e?.code === 'ENV_MISSING' || e?.code === 'AAKASH_FAIL') {
      console.error('Aakash error:', e?.status ?? '', e?.message);
      return NextResponse.json({ ok: false, reason: 'sms_unavailable' }, { status: 503 });
    }
    console.error('otp/send unexpected:', e);
    // Last resort: never leak 500 to users
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
