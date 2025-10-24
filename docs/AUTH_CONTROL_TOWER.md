# 🧭 Live Auth Control Tower (Updated 2025-10-24)

**Status note:** Email/Phone OTP → Onboard desync was traced to cookie commits and schema drift.

- `/api/auth/sync` now standardizes on `getSupabaseServer({ response })` and commits cookies on every POST/GET.
- OTP handlers in `lib/otp.ts` call `commitCookies(res)` after successful verification, eliminating middleware loops.

**Resolved items**
- Profiles schema mismatch: fixed by `20251024_align_profiles_and_trusted_factors.sql` (renames `user_id` → `id`, adds missing columns).
- Missing `trusted_factors` DDL: created with owner RLS; PIN routes can operate once table is present.
