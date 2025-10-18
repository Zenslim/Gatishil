import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Json =
  | {
      ok: true
      channel: 'email' | 'sms'
      sent: boolean
      message: string
    }
  | {
      ok: false
      channel?: 'email' | 'sms'
      sent?: false
      message: string
      reason?: string
    }

function json(data: Json, status = 200) {
  return NextResponse.json(data, { status })
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gatishilnepal.org').replace(/\/$/, '')

// Gate SMS separately so we can ship email today even if SMS infra is paused
const AUTH_SMS_ENABLED = String(process.env.NEXT_PUBLIC_AUTH_SMS_ENABLED || '').toLowerCase() === 'true'

// Minimal, local helpers
const isEmail = (v: string) => /\S+@\S+\.\S+/.test(v)
const isE164Nepal = (v: string) => /^\+977\d{8,10}$/.test(v) // allow +9779XXXXXXXX etc.

function pickIdentifier(body: any): { email?: string; phone?: string } {
  const identifier = (body?.identifier || '').trim()
  const email = (body?.email || '').trim()
  const phone = (body?.phone || '').trim()

  if (email) return { email }
  if (phone) return { phone }
  if (identifier) {
    if (isEmail(identifier)) return { email: identifier }
    return { phone: identifier }
  }
  return {}
}

function supabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase env not configured')
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })
}

async function sendEmailViaSupabase(email: string) {
  const supabase = supabaseClient()
  // numeric OTP template (not magic-link)
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

async function sendPhoneViaSupabase(phone: string) {
  const supabase = supabaseClient()
  const { error } = await supabase.auth.signInWithOtp({ phone })
  if (error) throw error
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { email, phone } = pickIdentifier(body)

    if (!email && !phone) {
      return json({ ok: false, message: 'Missing email or phone.' }, 400)
    }

    // EMAIL FLOW — always available
    if (email) {
      try {
        await sendEmailViaSupabase(email)
        return json({
          ok: true,
          channel: 'email',
          sent: true,
          message: 'OTP sent to your email. Expires in 5 minutes.',
        })
      } catch (err: any) {
        console.error('[otp/email] failed:', err?.message || err)
        // Soft failure → UI can suggest trying phone if in Nepal
        return json(
          {
            ok: false,
            channel: 'email',
            sent: false,
            message: 'Could not send email OTP right now.',
            reason: 'email_send_failed',
          },
          200
        )
      }
    }

    // PHONE FLOW — Nepal-only (+977)
    if (phone) {
      if (!isE164Nepal(phone)) {
        return json(
          {
            ok: false,
            channel: 'sms',
            sent: false,
            message: 'Phone OTP is Nepal-only. Enter a +977 number or use email.',
            reason: 'non_nepal_number',
          },
          200
        )
      }

      if (!AUTH_SMS_ENABLED) {
        return json(
          {
            ok: false,
            channel: 'sms',
            sent: false,
            message: 'SMS is temporarily paused. Please use your email to receive the code.',
            reason: 'sms_disabled',
          },
          200
        )
      }

      try {
        // Immediate, stable path: Supabase phone OTP
        await sendPhoneViaSupabase(phone)
        return json({
          ok: true,
          channel: 'sms',
          sent: true,
          message: 'OTP sent by SMS. Expires in 5 minutes.',
        })
      } catch (err: any) {
        console.error('[otp/sms] failed:', err?.message || err)
        // Soft failure: never throw a 503 to the UI
        return json(
          {
            ok: false,
            channel: 'sms',
            sent: false,
            message: 'Could not send SMS right now. Please use email instead.',
            reason: 'sms_send_failed',
          },
          200
        )
      }
    }

    // Should not reach here
    return json({ ok: false, message: 'Unhandled request.' }, 400)
  } catch (err: any) {
    console.error('[otp] fatal error:', err?.message || err)
    // Never leak 500/503 to the UI; keep UX deterministic
    return json(
      {
        ok: false,
        message: 'Could not process your request. Use email to receive the code.',
        reason: 'handler_error',
      },
      200
    )
  }
}
