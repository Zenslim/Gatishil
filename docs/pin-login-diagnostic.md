# PIN Login Production Regression – Diagnostic Report

## Summary

- **Date:** 2025-01-27
- **Affected endpoint:** `POST /api/pin/login`
- **Impact:** All PIN sign-ins failed. Email path returned `401 Wrong PIN`; phone path returned `404 Account not found`.

## Root Causes

### 1. Phone lookups used the wrong normalization

- The login handler queried `profiles.phone` using the helper that always produced `+977…` numbers.【F:app/api/pin/login/route.ts†L12-L18】
- Production data stores Nepali numbers without the leading `+` (E.164 digits only). The lookup therefore missed every phone account and surfaced a `404`.
- **Fix:** Normalize phones with `normalizeNepalToDB` and search for both the bare and `+` prefixed variants.【F:app/api/pin/login/route.ts†L14-L43】

### 2. Email-based accounts were never confirmed after PIN setup

- The PIN writer failed to confirm or assign a canonical email when creating credentials, leaving many GoTrue users in an `email_not_confirmed` state.【F:app/api/pin/set/route.ts†L63-L91】
- During login Supabase rejected password sign-in with "Email not confirmed", which the API translated into `401 Wrong PIN`.
- **Fixes:**
  - Confirm or synthesize a canonical email during `/api/pin/set` so passwords can be used.【F:app/api/pin/set/route.ts†L63-L102】
  - As a safety net, `/api/pin/login` now auto-confirms the email and retries once if Supabase still reports "Email not confirmed".【F:app/api/pin/login/route.ts†L66-L89】

### 3. PIN setter route had dead code paths and stale writes

- The previous implementation referenced undefined helpers (`genSalt`, `derivePasswordFromPin`, `supabaseSSR`, etc.) and attempted to update both `salt` and `salt_b64` without guarding for environments where the new column was not deployed.
- These bugs prevented consistent GoTrue password rotation, leaving profiles with mismatched derived passwords.
- **Fix:** Rewrite `/api/pin/set` with a working implementation that:
  - Validates the caller’s session via `createRouteHandlerClient`.
  - Derives the password with the shared crypto helper.
  - Upserts `auth_local_pin` with a fallback when `salt_b64` is absent.
  - Confirms email identity, rotates the GoTrue password, signs back in, and returns a refreshed session.【F:app/api/pin/set/route.ts†L1-L160】

## Regression Tests

1. **Email PIN login** – verified locally by creating a test user, setting a PIN, and signing in: response `204`, dashboard cookies set.
2. **Phone PIN login** – same flow with a `+977…` number stored both as digits and E.164: response `204` after normalization fallback.
3. **Join → Trust PIN → Dashboard** – confirmed session continuity by observing valid `sb-access-token`/`sb-refresh-token` cookies after `/api/pin/set` self-verifies.

## Follow-up

- Run `supabase_sql/20251025_fix_pin_salt.sql` in production if the `salt_b64` column is still missing to simplify future maintenance.
- Backfill canonical emails for legacy phone-only users by re-running `/api/admin/backfill-canonical-email` once.

