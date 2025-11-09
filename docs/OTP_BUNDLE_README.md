# OTP Bundle v2 (Unified Email + SMS + Hook)

## Files
- lib/otp.ts — single-source logic for send/verify (email + phone).
- app/api/otp/* — unified endpoints.
- app/api/otp/{email,phone}/* — shims to avoid breaking current UI.
- app/api/hooks/send-sms/route.ts — HTTPS hook that Supabase calls.

## Required Vercel Env
SUPABASE_URL
SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL=https://www.gatishilnepal.org

SUPABASE_SMS_HOOK_SECRET   # must match the secret in Supabase "Send SMS" hook
AAKASH_SMS_URL
AAKASH_API_KEY

## Required Supabase Auth Config
- Phone confirmations: ON
- SMS OTP length: 6
- SMS OTP expiry: 180s
- Send SMS hook: HTTPS → https://www.gatishilnepal.org/api/hooks/send-sms (rotate secret)
- Test pairs (no '+'): 9779812345678=123456,9779800000000=654321
- Test OTPs Valid Until: set date/time Asia/Kathmandu
