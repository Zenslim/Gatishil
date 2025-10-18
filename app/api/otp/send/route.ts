import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * OTP SEND API — FINAL (Aakash-only SMS)
 * - Email OTP: Supabase (numeric code, shouldCreateUser: true)
 * - Phone OTP (+977 only): Aakash SMS using AAKASH_SMS_API_KEY
 * - Persists phone OTP in Supabase table `otp_store` (5-min TTL)
 *
 * Env (Vercel):
 *  NEXT_PUBLIC_SUPABASE_URL
 *  NEXT_PUBLIC_SUPABASE_ANON_KEY
 *  SUPABASE_SERVICE_ROLE
 *  NEXT_PUBLIC_SITE_URL = https://www.gatishilnepal.org
 *  AAKASH_SMS_API_KEY
 *  AAKASH_SENDER_ID = GATISHIL   (optional; default used if missing)
 *
 * SQL reference (run once):
 *  create table if not exists public.otp_store (
 *    id uuid primary key default gen_random_uuid(),
 *    phone text not null,
 *    code text not null,
 *    expires_at timestamptz not null,
 *    created_at timestamptz not null default now()
 *  );
 *  create index if not exists idx_otp_store_phone_created_at on public.otp_store (phone, created_at desc);
 *  -- RLS: allow read/write only to service role.
 */

type Json =
  | { ok: true; channel: 'email' | 'sms'; sent: boolean; message: string }
  | { ok: false; channel?: 'email' | 'sms'; sent?: false; message: string; reason?: string }

function json(data: Json, status = 200) {
  return NextResponse.json(data, { status })
}

// ----- ENV -----
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_URL || '' : ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || ''
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gatishilnepal.org').replace(/\/$/, '')

const AAKASH_SMS_API_KEY = process.env.AAKASH_SMS_API_KEY || '' // << SINGLE KEY YOU USE
const AAKASH_SENDER_ID = process.env.AAKASH_SENDER_ID || 'GATISHIL'

// ----- HELPERS -----
const isEmail = (v: string) => /\S+@\S+\.\S+/.test(v)
const isE164Nepal = (v: string) => /^\+977\d{8,10}$/.test(v)

function pickIdentifier(body: any): { email?: string; phone?: string } {
  const identifier = (body?.identifier || '').trim()
  const email = (body?.email || '').trim()
  const phone = (body?.phone || '').trim()

  if (email) return { email }
  if (phone) return { phone }
  if (identifier) return isEmail(identifier) ? { email: identifier } : { phone: identifier }
  return {}
}

function supabaseAuthClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase auth env not configured')
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
}

function supabaseServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) throw new Error('Supabase service role env not configured')
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })
}

async function sendEmailViaSupabase(email: string) {
  const supabase = supabaseAuthClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${SITE_URL}/onboard?src=join`,
      data: { channel: 'email-otp' },
    },
  })
  if (error) throw error
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendSmsViaAakash(phone: string, text: string) {
  if (!AAKASH_SMS_API_KEY) throw new Error('AAKASH_SMS_API_KEY missing')
  const body = new URLSearchParams({
    key: AAKASH_SMS_API_KEY,
    route: 'sms',
    sender: AAKASH_SENDER_ID,
    phone,
    text,
  })
  const res = await fetch('https://sms.aakashsms.com/sms/v3/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  // Aakash returns JSON; success typically includes { "status":"success", ... }
  const data = await res.json().catch(() => ({}))
  if (!res.ok || (data && (data.error || data.status === 'error'))) {
    throw new Error(`Aakash SMS failed: ${JSON.stringify(data)}`)
  }
}

async function saveOtpToStore(phone: string, code: string, ttlMs = 5 * 60 * 1000) {
  const supa = supabaseServiceClient()
  const expiresAt = new Date(Date.now() + ttlMs).toISOString()
  const { error } = await supa.from('otp_store').insert({ phone, code, expires_at: expiresAt })
  if (error) throw error
}

// ----- HANDLER -----
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { email, phone } = pickIdentifier(body)

    if (!email && !phone) {
      return json({ ok: false, message: 'Missing email or phone.' }, 200)
    }

    if (email) {
      try {
        await sendEmailViaSupabase(email)
        return json({ ok: true, channel: 'email', sent: true, message: 'OTP sent to your email. Expires in 5 minutes.' })
      } catch (err: any) {
        console.error('[otp/email] failed:', err?.message || err)
        return json({ ok: false, channel: 'email', sent: false, message: 'Could not send email OTP right now.', reason: 'email_send_failed' }, 200)
      }
    }

    if (phone) {
      if (!isE164Nepal(phone)) {
        return json({ ok: false, channel: 'sms', sent: false, message: 'Phone OTP is Nepal-only. Enter a valid +977 number or use email.', reason: 'non_nepal_number' }, 200)
      }
      try {
        const otp = generateOtp()
        const text = `Your Gatishil Nepal OTP is ${otp}. Valid for 5 minutes.`
        await sendSmsViaAakash(phone, text)   // mandatory Aakash
        await saveOtpToStore(phone, otp)
        return json({ ok: true, channel: 'sms', sent: true, message: 'OTP sent by SMS via Aakash. Expires in 5 minutes.' })
      } catch (err: any) {
        console.error('[otp/sms/aakash] error:', err?.message || err)
        return json({ ok: false, channel: 'sms', sent: false, message: 'Could not send SMS right now. Please try again or use email.', reason: 'sms_send_failed' }, 200)
      }
    }

    return json({ ok: false, message: 'Unhandled request.' }, 200)
  } catch (err: any) {
    console.error('[otp] fatal error:', err?.message || err)
    return json({ ok: false, message: 'Could not process your request. Use email to receive the code.', reason: 'handler_error' }, 200)
  }
}
