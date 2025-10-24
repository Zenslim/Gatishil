# 📜 Auth & Profile Schema Contract

Authoritative snapshot of the database artefacts that authentication and onboarding rely on. Use it as the contract of record before modifying Supabase migrations or Next.js data access code.

## Table inventory

### `public.profiles`
Declared columns in repo migrations plus fields the app expects to read/write.

| Column | Type | Null? | Default | Defined where | Notes |
| --- | --- | --- | --- | --- | --- |
| `user_id` | `uuid` | not null | — | `2025-09-29_profiles_roots_json.sql` | Primary key referencing `auth.users(id)`; migration creates table if missing.【F:supabase/migrations/2025-09-29_profiles_roots_json.sql†L5-L12】|
| `roots_json` | `jsonb` | nullable | — | Same | Stores structured homeland selection from onboarding roots step.【F:supabase/migrations/2025-09-29_profiles_roots_json.sql†L14-L18】【F:components/onboard/RootsStep.jsx†L19-L39】|
| `diaspora_json` | `jsonb` | nullable | — | Same | Optional diaspora location payload; currently unused by UI.【F:supabase/migrations/2025-09-29_profiles_roots_json.sql†L19-L24】|
| `roots` / `diaspora` | `text` | nullable | — | Same | Legacy text fields retained for backwards compatibility.【F:supabase/migrations/2025-09-29_profiles_roots_json.sql†L26-L38】|
| `updated_at` | `timestamptz` | nullable | `now()` | Same | Auto-updated timestamp; onboarding writes explicit ISO strings.【F:supabase/migrations/2025-09-29_profiles_roots_json.sql†L40-L47】【F:components/onboard/NameFaceStep.jsx†L98-L115】|
| `hands`, `gifts`, `fire`, `heart` | `text[]` | nullable | `'{}'` | `supabase/sql/2025-10-02_add_janmandal_columns.sql` | Legacy Janmandal arrays kept for historical onboarding flows.【F:supabase/sql/2025-10-02_add_janmandal_columns.sql†L1-L16】|
| `journey` | `text` (enum) | nullable | — | Same | Constrained to `'rooted','branching','sapling','searching'` by migration.【F:supabase/sql/2025-10-02_add_janmandal_columns.sql†L13-L18】|
| `vision` | `text` | nullable | — | Same | Current Ātma Diśā step overwrites this string with joined selections.【F:supabase/sql/2025-10-02_add_janmandal_columns.sql†L16-L21】【F:components/AtmaDisha/AtmaDisha.jsx†L60-L96】|

App-level expectations (not declared in migrations): the React code upserts additional fields such as `id`, `name`, `surname`, `email`, `phone`, `photo_url`, `occupation`, `skill`, `passion`, `compassion`, `person_id`, `passkey_enabled`, and `passkey_cred_ids`. These columns must exist in production to avoid silent failures when onboarding writes or the dashboard selects them.【F:components/onboard/NameFaceStep.jsx†L75-L118】【F:components/AtmaDisha/AtmaDisha.jsx†L72-L99】【F:app/dashboard/page.tsx†L45-L86】

### `public.profile_trusted_devices`

| Column | Type | Null? | Default | Notes |
| --- | --- | --- | --- | --- |
| `user_id` | `uuid` | not null | — | References `auth.users(id)`; part of composite primary key.【F:supabase/migrations/20251017_add_trusted_devices.sql†L1-L8】|
| `device_id` | `text` | not null | — | Unique per user (PK `(user_id, device_id)`).【F:supabase/migrations/20251017_add_trusted_devices.sql†L1-L8】|
| `label` | `text` | nullable | — | Optional user-facing label.【F:supabase/migrations/20251017_add_trusted_devices.sql†L3-L8】|
| `created_at` | `timestamptz` | not null | `now()` | Auto timestamp.【F:supabase/migrations/20251017_add_trusted_devices.sql†L1-L8】|
| `last_used_at` | `timestamptz` | nullable | — | Updated externally when trust is refreshed.【F:supabase/migrations/20251017_add_trusted_devices.sql†L3-L8】|

### `public.trusted_factors` (expected)
No migration ships with this table, yet `/api/pin/set` and `/api/pin/login` depend on it. The code implies the following schema:

| Column | Type | Null? | Notes |
| --- | --- | --- | --- |
| `auth_user_id` | `uuid` | not null | Looked up via Supabase admin; treated as unique per factor.【F:app/api/pin/login/route.ts†L57-L98】|
| `factor_type` | `text` | not null | Code filters with `'pin'`; suggests a composite key `(auth_user_id, factor_type)`.【F:app/api/pin/login/route.ts†L57-L98】|
| `pin_hash` | `text` | not null | Stores Argon2 hash produced by `@node-rs/argon2` (PHC string).【F:app/api/pin/set/route.ts†L18-L31】|
| `failed_attempts` | `int` | not null | Incremented on invalid PIN; reset on success.【F:app/api/pin/login/route.ts†L63-L83】|
| `locked_until` | `timestamptz` | nullable | Throttles login after ≥5 failures for 15 minutes.【F:app/api/pin/login/route.ts†L69-L83】|

Deployments must create this table (and unique constraint on `auth_user_id`) for PIN flows to function.

### `public.otps`

| Column | Type | Null? | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `bigserial` | not null | auto | Primary key for auditing OTP sends.【F:supabase/migrations/20251105_unified_otps.sql†L1-L11】|
| `phone` | `text` | not null | — | Check constraint enforces `^\+97798\d{8}$`; migration deletes non-matching rows.【F:supabase/migrations/20251105_unified_otps.sql†L13-L31】|
| `code` | `text` | not null | — | `char_length(code) = 6` enforced by constraint.【F:supabase/migrations/20251105_unified_otps.sql†L24-L31】|
| `expires_at` | `timestamptz` | not null | — | TTL for OTP validity.【F:supabase/migrations/20251105_unified_otps.sql†L1-L21】|
| `status` | `text` | not null | `'sent'` | Tracks lifecycle (`sent`, `used`, etc.).【F:supabase/migrations/20251105_unified_otps.sql†L5-L21】|
| `attempts` | `int` | not null | `0` | Increment when verifying; used for rate limiting.【F:supabase/migrations/20251105_unified_otps.sql†L5-L21】|
| `created_at` | `timestamptz` | not null | `now()` | Insert timestamp for housekeeping.【F:supabase/migrations/20251105_unified_otps.sql†L5-L21】|

### Identity linkage tables (expected but absent)
- `public.user_person_links` — Queried by the dashboard to map Supabase users to people records, yet no migration creates it. The backfill script assumes columns `(user_id uuid, person_id uuid)` and a unique constraint on `user_id`.【F:app/dashboard/page.tsx†L61-L74】【F:supabase/sql/backfill_person_link.sql†L5-L21】
- `public.person_identities` — Cleanup migration adjusts constraints/triggers, but the base table definition is missing from the repo. Production must already have columns `identity_type`, `identity_value`, `is_verified`, etc., matching the updated constraints.【F:supabase/migrations/20251014T2100_identity_schema_cleanup.sql†L1-L110】

## Row level security summary

| Table | Policies | Effect |
| --- | --- | --- |
| `public.profiles` | `profiles_self_upsert` (FOR ALL, using `auth.uid() = user_id`) | Members can upsert their own profile rows; others blocked.【F:supabase/migrations/2025-09-29_profiles_roots_json.sql†L55-L65】|
| `public.profile_trusted_devices` | `owner_select/insert/update/delete` | Authenticated users manage their own trusted devices only.【F:supabase/migrations/20251017_add_trusted_devices.sql†L9-L15】|
| `public.otps` | None declared | Table operates without RLS; server-side routes must guard access manually.【F:supabase/migrations/20251105_unified_otps.sql†L1-L31】|
| `public.trusted_factors` | Not defined | Implement appropriate RLS (e.g., user owns row) when creating the table to avoid leaking hashed PINs. |

## Functions & triggers
No Supabase functions or triggers ship with the repo for syncing profiles or passkeys. The identity cleanup migration references a desired trigger `sync_verified_identity_into_profile`, implying deployments should ensure that function exists to mirror verified emails/phones into `profiles`.【F:supabase/migrations/20251014T2100_identity_schema_cleanup.sql†L111-L141】

## Data contracts used by the app

| Surface | Request payload | Response / side effects | Notes |
| --- | --- | --- | --- |
| `/api/otp/email/send` | `{ email: string; type?: 'otp' | 'magiclink'; redirectTo?: string }` | `{ ok: true, channel: 'email', mode }` or `{ error }`; commits Supabase cookies via SSR helper.【F:lib/otp.ts†L30-L70】 | Email address normalised to lowercase; optional `redirectTo` defaults to `NEXT_PUBLIC_SITE_URL`. |
| `/api/otp/email/verify` | `{ email: string; token: string }` | `{ ok: true, channel: 'email', user, session }` plus Set-Cookie; session echoed to client for `supabase.auth.setSession`.【F:lib/otp.ts†L85-L123】【F:app/join/JoinClient.tsx†L202-L241】 | Code expects 6-digit token; server trusts Supabase validation. |
| `/api/otp/phone/send` | `{ phone: string }` | `{ ok: true, channel: 'phone', mode: 'sms' }`; Supabase triggers webhook to `/api/hooks/send-sms`.【F:lib/otp.ts†L70-L83】【F:app/api/hooks/send-sms/route.ts†L1-L141】 | Phone must normalise to `+9779[78]XXXXXXXX`. |
| `/api/otp/phone/verify` | `{ phone: string; token: string }` | `{ ok: true, channel: 'phone', user, session }` with cookies committed; also attempts to scrub legacy alias emails via admin client.【F:lib/otp.ts†L95-L133】 | Caller should call `supabase.auth.setSession` with returned tokens to update browser state.【F:app/join/JoinClient.tsx†L188-L199】 |
| `/api/auth/exchange` | `{ code: string }` | `{ ok, session, user }` and Set-Cookie; used when onboarding receives OAuth/OTP redirect codes.【F:app/api/auth/exchange/route.ts†L8-L29】【F:components/OnboardingFlow.tsx†L32-L84】 | Sanitises empty body; errors returned as `{ ok: false, error }`. |
| `/api/auth/sync` | Either `{ access_token, refresh_token }` or `{ event: 'TOKEN_REFRESHED', session: { access_token, refresh_token } }` | `{ ok: true|false }`; uses `supabase.auth.setSession` to write httpOnly cookies.【F:app/api/auth/sync/route.ts†L25-L88】 | Clients post with `credentials:'include'` (see `lib/supabase/browser.ts`). |
| `/api/pin/set` | `{ pin: string }` | `{ ok: true }` or error text; persists Argon2 hash to `trusted_factors`.【F:app/api/pin/set/route.ts†L1-L38】 | Accepts only 4–8 digit numeric PINs. |
| `/api/pin/login` | `{ method: 'phone'|'email'; user: string; pin: string; next?: string }` | 303 redirect with cookies set; SPA treats any success as completion.【F:app/api/pin/login/route.ts†L1-L118】【F:app/login/LoginClient.tsx†L60-L101】 | Admin client generates OTP link, so Supabase must permit service-role generateLink. |
| Local PIN storage | PIN digits entered in Trust step | `localStorage['gn.local.secret'] = JSON.stringify({ iv:number[], ct:number[] })`; `localStorage['gn.local.salt'] = JSON.stringify({ salt:number[] })` | AES-GCM secret derived from PIN via PBKDF2; used only on the client to detect trusted devices.【F:lib/localPin.ts†L2-L36】 |

## Gaps & contradictions
- **Profiles column drift:** UI inserts fields (`id`, `name`, `email`, `occupation`, etc.) that migrations never add. Align schema (rename `user_id` → `id` or update queries) before relying on onboarding writes.【F:components/onboard/NameFaceStep.jsx†L75-L118】【F:supabase/migrations/2025-09-29_profiles_roots_json.sql†L5-L37】
- **Missing `trusted_factors` migration:** PIN setup/login will throw unless deployments manually provision the table with expected columns and unique constraints.【F:app/api/pin/set/route.ts†L18-L34】【F:app/api/pin/login/route.ts†L52-L98】
- **Undocumented identity tables:** Dashboard joins `user_person_links` and migrations tweak `person_identities`, but the repo omits their DDL. Document or add migrations to avoid divergent staging/production schemas.【F:app/dashboard/page.tsx†L61-L74】【F:supabase/sql/backfill_person_link.sql†L5-L21】【F:supabase/migrations/20251014T2100_identity_schema_cleanup.sql†L1-L141】
- **RLS gaps on OTP/PIN data:** `public.otps` and the expected `trusted_factors` lack RLS definitions; enforce row ownership or restrict to service-role usage to prevent leakage if exposed via Supabase APIs.【F:supabase/migrations/20251105_unified_otps.sql†L1-L31】【F:app/api/pin/login/route.ts†L52-L96】
- **`@gn.local` cleanup best-effort only:** Phone verification swallows admin update failures when removing alias emails, so databases may retain fabricated addresses until a manual sweep runs.【F:lib/otp.ts†L107-L128】
