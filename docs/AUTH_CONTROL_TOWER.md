# 🧭 Live Auth Control Tower

A current-state map of Gatishil Nepal’s authentication flows. Use it to coordinate fixes across web, API, and Supabase.

## Routes & Guards

### Pages, layouts, and middleware
| Path | Source | Method(s) | Runtime | Guard & redirect behaviour |
| --- | --- | --- | --- | --- |
| `/join` | `app/join/page.tsx` → `JoinClient` | GET | Node (default) | Client effect checks `supabase.auth.getSession`; any existing session triggers `router.replace('/onboard?src=join')`. Phone/email OTP actions call API routes with `credentials:'include'`.【F:app/join/page.tsx†L1-L11】【F:app/join/JoinClient.tsx†L41-L61】【F:app/join/JoinClient.tsx†L81-L120】
| `/verify` | `app/verify/page.tsx` | GET | Client-only | Immediately `window.location.replace('/join')` for legacy links.【F:app/verify/page.tsx†L1-L9】
| `/auth/callback` | `app/auth/callback/page.tsx` + `Client.tsx` | GET | Node shell + client worker | Client exchanges `code` or `token_hash`, posts to `/api/auth/sync`, then `router.replace(next || '/onboard?src=join')` after verifying or short-circuiting existing sessions.【F:app/auth/callback/page.tsx†L1-L12】【F:app/auth/callback/Client.tsx†L8-L108】
| `/onboard` | `app/onboard/page.tsx` → `OnboardingFlow` | GET | Client (force-dynamic) | Handles PKCE/email `code` via `/api/auth/exchange`; steps advance via query string. Final Trust step pushes `/dashboard`. Middleware also guards the route (see below).【F:app/onboard/page.tsx†L1-L24】【F:components/OnboardingFlow.tsx†L1-L126】【F:components/OnboardingFlow.tsx†L162-L196】
| `/dashboard` | `app/dashboard/page.tsx` | GET | Node (`runtime = 'nodejs'`) | Server `getSupabaseServer().auth.getUser()`; missing session → `redirect('/login?next=/dashboard')`. Reads profile/link tables on success.【F:app/dashboard/page.tsx†L1-L63】
| `/login` | `app/login/page.tsx` → `LoginClient` | GET | Node (default) | Server simply forwards `next` param. Client form posts to `/api/pin/login`; on success `router.replace(nextPath)`. No sanitisation of `next` inside client (potential open redirect).【F:app/login/page.tsx†L1-L10】【F:app/login/LoginClient.tsx†L1-L112】
| `(protected)` layout | `app/(protected)/layout.tsx` | GET | Node | Server layout checks `getSupabaseServer().auth.getUser()`; redirects to `/login?next=/dashboard` when unauthenticated before rendering nested pages.【F:app/(protected)/layout.tsx†L1-L16】
| Middleware guard | `middleware.ts` | edge | Matches `/dashboard`, `/onboard`, `/people`. Rejects when no Supabase cookies, redirecting to `/login?next=…`; allows Supabase `?code=` callbacks to pass.【F:middleware.ts†L5-L55】【F:middleware.ts†L57-L60】

### API surfaces that touch auth
| Path | Source | Method(s) | Runtime | Notes |
| --- | --- | --- | --- | --- |
| `/api/otp/phone/send` | `app/api/otp/phone/send/route.ts` → `lib/otp.handleSend` | POST | Node | Validates Nepal numbers and calls `supabase.auth.signInWithOtp` (SMS). Response commits Supabase cookies to align with Supabase SSR helpers.【F:app/api/otp/phone/send/route.ts†L1-L4】【F:lib/otp.ts†L12-L83】
| `/api/otp/phone/verify` | `app/api/otp/phone/verify/route.ts` → `lib/otp.handleVerify` | POST | Node | Verifies SMS OTP through Supabase, attempts to scrub legacy `@gn.local` emails via admin client, returns `{ ok, channel, user, session }` plus Set-Cookie.【F:app/api/otp/phone/verify/route.ts†L1-L4】【F:lib/otp.ts†L85-L133】
| `/api/otp/email/send` | `app/api/otp/email/send/route.ts` → `handleSend` | POST | Node | Same handler; sends Supabase email OTP/magic link depending on payload.【F:app/api/otp/email/send/route.ts†L1-L4】【F:lib/otp.ts†L30-L70】
| `/api/otp/email/verify` | `app/api/otp/email/verify/route.ts` → `handleVerify` | POST | Node | Server-side `supabase.auth.verifyOtp` for 6-digit email codes; returns Supabase session payload with cookies committed.【F:app/api/otp/email/verify/route.ts†L1-L4】【F:lib/otp.ts†L85-L123】
| `/api/otp/send` | `app/api/otp/send/route.ts` | POST | Node | Legacy combined endpoint using `createRouteHandlerClient` for Supabase OTP dispatch (email + phone). Still accessible and writes cookies through auth helper.【F:app/api/otp/send/route.ts†L1-L53】
| `/api/otp/verify` | `app/api/otp/verify/route.ts` | POST | Node | Legacy phone verify that relies on Supabase auth helper; retains cookie write behaviour but returns `{ ok }` only.【F:app/api/otp/verify/route.ts†L1-L52】
| `/api/auth/exchange` | `app/api/auth/exchange/route.ts` | POST | Node | Exchanges Supabase `code` for session, returns `{ ok, session, user }`, and commits cookies before responding.【F:app/api/auth/exchange/route.ts†L1-L29】
| `/api/auth/session` | `app/api/auth/session/route.ts` | GET | Node | Lightweight probe returning `{ authenticated }` after calling `supabase.auth.getUser()`; no cookie mutations.【F:app/api/auth/session/route.ts†L1-L20】
| `/api/auth/sync` | `app/api/auth/sync/route.ts` | POST, GET | Node | Accepts either legacy `{ access_token, refresh_token }` or helper-shaped payloads; calls `supabase.auth.setSession()` via auth helper to set cookies. GET acts as a health probe.【F:app/api/auth/sync/route.ts†L1-L88】
| `/api/pin/set` | `app/api/pin/set/route.ts` | POST | Node | Validates 4–8 digit PIN, Argon2 hashes it, and upserts into `trusted_factors`. Requires authenticated Supabase user.【F:app/api/pin/set/route.ts†L1-L38】
| `/api/pin/login` | `app/api/pin/login/route.ts` | POST | Node | Looks up user (email or phone) via admin client, verifies Argon2 PIN hash, generates Supabase session via admin OTP link, commits cookies, and returns 303 redirect to `next` (default `/dashboard`).【F:app/api/pin/login/route.ts†L1-L118】
| `/api/hooks/send-sms` | `app/api/hooks/send-sms/route.ts` | GET, POST | Node | Supabase OTP hook target. Normalises payload, rewrites to Aakash v4 JSON, and always returns 200 with debug metadata when enabled.【F:app/api/hooks/send-sms/route.ts†L1-L141】

## Flow playbooks

### Join → Email OTP (6-digit) → Onboard
1. Visitor loads `/join`; client tab defaults to email/phone UI, with existing sessions redirected to `/onboard?src=join`.【F:app/join/JoinClient.tsx†L41-L69】
2. `Send 6-digit code` posts to `/api/otp/email/send` with `{ email, type: 'otp', redirectTo }`. Handler calls Supabase `signInWithOtp` and responds `{ ok: true, channel: 'email', mode: 'otp' }`, setting cookies for consistency.【F:app/join/JoinClient.tsx†L164-L202】【F:lib/otp.ts†L30-L70】
3. User enters the code; `verifyEmailOtp` posts `{ email, token }` to `/api/otp/email/verify`. Server verifies through Supabase and returns session tokens.【F:app/join/JoinClient.tsx†L202-L241】【F:lib/otp.ts†L85-L123】
4. Client calls `supabase.auth.setSession` with returned tokens, then `router.replace('/onboard?src=join')` and `router.refresh()` to revalidate middleware-protected routes.【F:app/join/JoinClient.tsx†L219-L241】
5. Middleware sees fresh `sb-*` cookies and allows `/onboard` to load. Onboarding flow removes `code` query params once sessions are confirmed.【F:middleware.ts†L27-L55】【F:components/OnboardingFlow.tsx†L32-L88】

### Join → Phone OTP (+977 Aakash) → Onboard
1. Phone tab normalises input to +977 format before enabling the send button.【F:app/join/JoinClient.tsx†L73-L120】
2. `Send SMS` posts to `/api/otp/phone/send` with `{ phone }`; handler calls Supabase SMS OTP and responds `{ ok: true, channel: 'phone', mode: 'sms' }` while cookie-syncing.【F:app/join/JoinClient.tsx†L96-L140】【F:lib/otp.ts†L70-L83】
3. Supabase invokes `/api/hooks/send-sms` to deliver the OTP through Aakash. Hook normalises phone, builds payload, and returns `{ ok: true, delivered }` (or debug info when missing data).【F:app/api/hooks/send-sms/route.ts†L1-L141】
4. `Verify & Continue` posts `{ phone, token }` to `/api/otp/phone/verify`; handler verifies via Supabase, scrubs legacy alias emails, and returns session tokens.【F:app/join/JoinClient.tsx†L140-L188】【F:lib/otp.ts†L95-L133】
5. Client seeds `supabase.auth.setSession`, navigates to `/onboard?src=join`, and refreshes the router. Middleware honours the new cookies.【F:app/join/JoinClient.tsx†L188-L199】【F:middleware.ts†L27-L55】

### Onboard → Trust (PIN) → Dashboard
1. `OnboardingFlow` exchanges any `?code=` query via `/api/auth/exchange`, setting Supabase cookies before continuing.【F:components/OnboardingFlow.tsx†L32-L84】【F:app/api/auth/exchange/route.ts†L1-L29】
2. Name/face, roots, and Ātma Diśā steps call Supabase client-side to upsert/update `profiles` rows (expecting columns such as `name`, `roots_json`, `occupation`, `vision`).【F:components/onboard/NameFaceStep.jsx†L57-L118】【F:components/onboard/RootsStep.jsx†L3-L43】【F:components/AtmaDisha/AtmaDisha.jsx†L12-L99】
3. Trust Step checks for existing encrypted PIN in `localStorage` and offers reuse. Saving a new PIN calls `createLocalPin(pin)` then posts `{ pin }` to `/api/pin/set` (requires authenticated user).【F:components/onboard/TrustStep.jsx†L8-L134】【F:app/api/pin/set/route.ts†L1-L38】
4. Trust Step waits for a Supabase session (`waitForSession`) before `router.replace(next || '/dashboard')` and `router.refresh()`. No additional `/api/auth/sync` call occurs here, so it relies on earlier cookie writes.【F:components/onboard/TrustStep.jsx†L9-L110】【F:components/onboard/TrustStep.jsx†L136-L179】

### Next-time Login (User + PIN)
1. `/login` renders `LoginClient`, defaulting to phone tab and reading `next` from query without sanitisation.【F:app/login/page.tsx†L1-L10】【F:app/login/LoginClient.tsx†L1-L59】
2. Form submission posts `{ method, user, pin, next }` to `/api/pin/login` with cookies included.【F:app/login/LoginClient.tsx†L60-L101】
3. API locates the user via Supabase admin (email or phone), loads PIN hash from `trusted_factors`, and verifies with Argon2. Failures increment `failed_attempts` and optionally set `locked_until`.【F:app/api/pin/login/route.ts†L21-L80】
4. On success, API generates a one-time OTP via admin `generateLink`, verifies it through a response-bound Supabase server client to mint cookies, commits them, and responds with 303 redirect to `next` (default `/dashboard`).【F:app/api/pin/login/route.ts†L82-L117】
5. Client treats any 2xx/3xx as success and calls `router.replace(nextPath)` and `router.refresh()` to load the destination.【F:app/login/LoginClient.tsx†L82-L101】

### Forgot PIN (6-digit reset)
No dedicated forgot-PIN flow exists in the current codebase. The `/login` CTA points to `/forgot-pin`, but no route or API implements a reset; users must re-run the OTP join flow to regain access.【F:app/login/LoginClient.tsx†L125-L136】

## Cookie mechanics
- **`lib/supabase/server.ts` (`getSupabaseServer`)** – Uses the recommended `{ getAll, setAll }` adapter for `@supabase/ssr`, enabling multi-cookie writes on the same response. Callers must invoke `supabase.commitCookies(res)` after mutations (e.g., `/api/auth/exchange`, `lib/otp.respond`).【F:lib/supabase/server.ts†L1-L33】【F:app/api/auth/exchange/route.ts†L15-L29】【F:lib/otp.ts†L40-L47】
- **`lib/supabaseServer.ts` (`getServerSupabase`)** – Legacy helper wiring `{ get, set, remove }`. It patches legacy JSON cookie fallbacks but cannot batch `setAll`; still used implicitly by `createRouteHandlerClient` and older code paths.【F:lib/supabaseServer.ts†L1-L46】
- **`lib/spine.ts`** – Creates a server client with `get/set/remove` only; no `commitCookies` helper. Any writes within these helpers rely on implicit cookie mutation and may miss multi-cookie updates.【F:lib/spine.ts†L1-L33】
- **`lib/otp.respond()`** – Wraps JSON responses from OTP handlers and always calls `supabase.commitCookies(res)` to persist Supabase-auth cookies alongside the payload.【F:lib/otp.ts†L40-L47】
- **`/api/auth/exchange`** – Invokes `supabase.commitCookies` before returning `{ ok, session }`, ensuring onboarding flows receive cookies during the same response.【F:app/api/auth/exchange/route.ts†L15-L29】
- **`/api/pin/login`** – Binds a response object when creating the Supabase server client so `commitCookies(resp)` writes cookies on the redirect before returning.【F:app/api/pin/login/route.ts†L84-L109】
- **`/api/auth/sync`** – Uses `createRouteHandlerClient({ cookies })`; `supabase.auth.setSession` mutates the Next.js cookie store directly, committing during the same response without manual `commitCookies`.【F:app/api/auth/sync/route.ts†L33-L68】
- **Browser auto-sync** – `lib/supabase/browser.ts` listens for `TOKEN_REFRESHED` events and POSTs to `/api/auth/sync`. Initial `SIGNED_IN` events are not synced automatically, so first-party routes must rely on their own Set-Cookie responses.【F:lib/supabase/browser.ts†L1-L42】

## Redirect matrix
| Trigger | Source | Condition | Destination | `next` handling |
| --- | --- | --- | --- | --- |
| Existing session on load | `/join` client effect | `supabase.auth.getSession` finds a session | `/onboard?src=join` | Not configurable; query param preserved if present.【F:app/join/JoinClient.tsx†L41-L69】
| OTP verification success | `/join` phone/email handlers | Server returns session tokens | `/onboard?src=join` | Hard-coded; ignores incoming `next`.【F:app/join/JoinClient.tsx†L188-L241】
| Supabase callback | `/auth/callback` | `code`/`token_hash` exchange succeeds | `next` query or `/onboard?src=join` | `next` is trusted from query without extra validation.【F:app/auth/callback/Client.tsx†L12-L108】
| Middleware gate | `middleware.ts` | Protected path without cookies | `/login?next=<original>` | Uses original pathname + search to populate `next`.【F:middleware.ts†L13-L55】
| Server guard | `/dashboard/page.tsx` | `auth.getUser()` returns no user | `/login?next=/dashboard` | Hard-coded next target.【F:app/dashboard/page.tsx†L34-L44】
| Protected layout | `app/(protected)/layout.tsx` | Layout encounters no session | `/login?next=/dashboard` | Hard-coded.|【F:app/(protected)/layout.tsx†L8-L16】
| Trust Step finish | `/onboard` → `TrustStep` | PIN saved or reused | `next` query or `/dashboard` | Reads `?next=` from onboard URL; defaults to `/dashboard`.【F:components/onboard/TrustStep.jsx†L20-L134】
| PIN login success | `/api/pin/login` redirect consumed by SPA | PIN verified | `next` body field or `/dashboard` | API honours body `next`; client reuses same value without validation.【F:app/api/pin/login/route.ts†L24-L117】【F:app/login/LoginClient.tsx†L60-L101】

## State race points & diagnostics
- **Client-side Supabase mutations:** Join flows call `supabase.auth.setSession` after server verification; Trust Step waits for `SIGNED_IN` via `waitForSession`. A failure to receive `SIGNED_IN` within 8 s rejects navigation.【F:app/join/JoinClient.tsx†L206-L241】【F:components/onboard/TrustStep.jsx†L9-L110】
- **Cookie reliance on `/api/auth/sync`:** Only token refreshes trigger automatic sync; initial sign-ins depend on API responses that already commit cookies (OTP handlers, `/api/auth/exchange`, PIN login). Missing commits would strand users at middleware redirects.【F:lib/supabase/browser.ts†L7-L42】【F:lib/otp.ts†L40-L47】
- **Legacy OTP routes still deployed:** `/api/otp/send` and `/api/otp/verify` remain accessible alongside new `/phone/*` endpoints; clients should avoid mixing them to prevent rate-limit conflicts or mismatched responses.【F:app/api/otp/send/route.ts†L1-L53】【F:app/api/otp/phone/verify/route.ts†L1-L4】
- **`next` parameter trust:** `/auth/callback` and `/login` propagate `next` without validation, opening the door to open redirects if external URLs are injected upstream.【F:app/auth/callback/Client.tsx†L12-L104】【F:app/login/LoginClient.tsx†L14-L104】
- **Admin email scrubbing:** Phone OTP verification tries to null legacy `@gn.local` emails; failures are swallowed, so stale aliases may persist until the admin task succeeds.【F:lib/otp.ts†L107-L128】
- **PIN storage expectations:** `/api/pin/set` writes to `trusted_factors`, but the table is not defined in migrations—deployed databases must create it manually to avoid runtime errors.【F:app/api/pin/set/route.ts†L20-L33】

## Known regressions & suspects
- **Profiles schema mismatch:** Onboarding writes `profiles` columns (`id`, `name`, `surname`, `occupation`, `vision`, etc.) that do not exist in supplied migrations, causing silent failures or `null` results on `/dashboard`. Align schema to include these fields or update queries to match the real table (`user_id` primary key).【F:components/onboard/NameFaceStep.jsx†L75-L118】【F:app/dashboard/page.tsx†L45-L81】【F:supabase/migrations/2025-09-29_profiles_roots_json.sql†L5-L37】
- **Missing `trusted_factors` DDL:** PIN APIs expect a table with columns `auth_user_id`, `factor_type`, `pin_hash`, `failed_attempts`, `locked_until`, yet no migration creates it. Without it, PIN setup/login fails at runtime.【F:app/api/pin/set/route.ts†L20-L34】【F:app/api/pin/login/route.ts†L52-L96】
- **Unsanitised `next` redirects:** `LoginClient` forwards raw `next` query strings; `/auth/callback` trusts its query param. Harden by validating against internal paths to avoid `/login?next=https://attacker`.【F:app/login/LoginClient.tsx†L14-L104】【F:app/auth/callback/Client.tsx†L12-L104】
- **Trust Step cookie gap:** Trust Step never posts to `/api/auth/sync`; if earlier cookie commits failed, users could hit `/dashboard` middleware loops despite having a client session. Consider syncing after PIN confirmation.【F:components/onboard/TrustStep.jsx†L128-L179】
- **Legacy OTP duplicates:** Old `/api/otp/send`/`verify` coexist with new channel-specific routes, risking inconsistent logging or throttle semantics if both are triggered by clients. Remove or hard-disable legacy endpoints once new flows are stable.【F:app/api/otp/send/route.ts†L1-L53】【F:app/api/otp/phone/send/route.ts†L1-L4】
