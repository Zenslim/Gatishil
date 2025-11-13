# Auth Audit

## Routing Map

### `/api/otp/send`
- **Runtime:** Node.js (`export const runtime = 'nodejs'`; `dynamic = 'force-dynamic'`).
- **Caller(s):** Client components such as `app/join/JoinClient.tsx` (email + phone lane) and any fetchers hitting the unified OTP endpoint.
- **Request shape:** JSON body with optional `{ email?: string, phone?: string }`; server normalizes Nepal numbers to `+9779…`.
- **Response shape:** JSON `{ ok: true, email }` / `{ ok: true, phone }` on success, `{ ok: false, error }` otherwise (never non-200 errors).
- **Side effects:** Uses `createRouteHandlerClient({ cookies })` so Supabase helper writes auth cookies when OTP sent (no session yet).
- **Notes:** For email the redirect target is built from `NEXT_PUBLIC_SITE_URL` and hard-coded `/auth/callback`.

_Sets up email or SMS OTP via Supabase, normalizing Nepal numbers and redirect URL._
```ts
// app/api/otp/send/route.ts (lines 1-53)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
...
const np = normalizeNp(body?.phone ?? null);
...
if (email) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${site}/auth/callback` },
  });
  return NextResponse.json({ ok: true, email });
}

if (np) {
  await supabase.auth.signInWithOtp({
    phone: np,
    options: { channel: 'sms', shouldCreateUser: true },
  });
  return NextResponse.json({ ok: true, phone: np });
}
```

### `/api/otp/verify`
- **Runtime:** Node.js (`runtime = 'nodejs'`; `dynamic = 'force-dynamic'`).
- **Caller(s):** Intended for client verification POST when finishing SMS OTP (not currently used by `JoinClient`, which calls Supabase directly).
- **Request shape:** JSON `{ phone: string, token: string }` (Nepal number normalized server-side).
- **Response shape:** JSON `{ ok: true }` on success or `{ ok: false, error }` on error (always 200).
- **Side effects:** Creates Supabase route handler client with `cookies`; helper writes auth cookies during `supabase.auth.verifyOtp` when session issued.
- **Status codes:** Always HTTP 200, even when `{ ok: false }`.

_Server-side SMS OTP verification that writes Supabase cookies when session is created._
```ts
// app/api/otp/verify/route.ts (lines 1-45)
export const runtime = 'nodejs';
...
const supabase = createRouteHandlerClient({ cookies: cookieStore });
...
const { data, error } = await supabase.auth.verifyOtp({
  phone,
  token,
  type: 'sms',
});
...
// Cookies are set by the helper on success
return NextResponse.json({ ok: true });
```

### `/api/auth/sync`
- **Runtime:** Node.js (`runtime = 'nodejs'`; `dynamic = 'force-dynamic'`).
- **Caller(s):** Browser Supabase client (`lib/supabase/browser.ts`) and `/auth/callback/Client.tsx` after exchanging OAuth/email codes.
- **Request shape:** Accepts legacy `{ access_token, refresh_token }` **or** helper-style `{ event: 'SIGNED_IN', session: { access_token, refresh_token } }`.
- **Response shape:** Always HTTP 200 JSON `{ ok: true }` or `{ ok: false, error }` so clients never hit Supabase errors.
- **Side effects:** Uses `createRouteHandlerClient({ cookies })` to call `supabase.auth.setSession`, writing the `sb-access-token`/`sb-refresh-token` cookies.
- **Notes:** Errors are reported in body but not via status codes.

_Sets Supabase cookies on the server for either legacy or helper payloads._
```ts
// app/api/auth/sync/route.ts (lines 1-69)
export const runtime = 'nodejs';
...
const { access_token, refresh_token } = extractTokens(body);
...
const supabase = createRouteHandlerClient({ cookies });
const { error } = await supabase.auth.setSession({ access_token, refresh_token });
...
return NextResponse.json({ ok: true }, { status: 200 });
```

### `/auth/callback`
- **Runtime:** Page is server-rendered shell (`dynamic = 'force-dynamic'`); token exchange happens in the client component.
- **Caller(s):** Supabase email magic links & OAuth redirect (`emailRedirectTo` is `${SITE}/auth/callback`).
- **Flow:** Client reads `code` or `token_hash` from search params, uses `getSupabaseBrowser()` to call `supabase.auth.exchangeCodeForSession`, then `fetch('/api/auth/sync', …)` to persist cookies, finally `router.replace(next)` (default `/onboard?src=join`).
- **Side effects:** Client fetch to `/api/auth/sync` writes cookies; redirect happens immediately after `fetch` resolves (no server redirect).
- **Notes:** If already signed in, client skips exchange and replaces to `next` directly.

_Client component exchanges Supabase code then POSTs to `/api/auth/sync` before redirecting._
```tsx
// app/auth/callback/Client.tsx (lines 32-83)
if (code) {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  const { data: after } = await supabase.auth.getSession();
  ...
  await fetch('/api/auth/sync', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      access_token: after.session.access_token,
      refresh_token: after.session.refresh_token ?? null,
    }),
  });
  if (!cancelled) {
    setStatus('done');
    router.replace(next);
  }
}
```

### `/api/hooks/send-sms`
- **Runtime:** Node.js (`runtime = 'nodejs'`; `dynamic = 'force-dynamic'`).
- **Caller(s):** Supabase Auth SMS hook (Aakash provider) posts JSON payloads; endpoint also supports manual tests.
- **Protocol:** Accepts JSON (never form-data); always returns HTTP 200 with diagnostic body.
- **Downstream:** Calls Aakash SMS v4 endpoint (`https://sms.aakashsms.com/sms/v4/send-user`) using `auth-token` header and JSON body `{ to: [local10], text: [msg], from? }`.
- **Normalization:** Extracts phone via `auth_event.actor_username` fallback, coerces to `+9779…`, converts to local 10-digit for Aakash v4.
- **Status codes:** Never returns 4xx/5xx to Supabase; non-success is indicated via `{ ok: false, reason }` JSON.

_Aakash v4 relay that always returns 200 and reads Supabase `auth_event` payloads._
```ts
// app/api/hooks/send-sms/route.ts (lines 1-120)
export const runtime = 'nodejs';
...
const AAKASH_URL = process.env.AAKASH_SMS_BASE_URL || 'https://sms.aakashsms.com/sms/v4/send-user';
...
const rawPhone = pickPhone(body);
...
const res = await fetch(AAKASH_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'auth-token': AAKASH_KEY,
  },
  body: JSON.stringify(payload),
});
return J({ ok: true, delivered: true, number: e164, aakash: parsed ?? txt.slice(0, 400) });
```

## Email OTP Path (Today)
- **OTP send:** `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` invoked in `app/join/JoinClient.tsx` (client) and `/api/otp/send` (server helper). Client flow builds redirect as `${origin}/onboard?src=join`; server flow points to `${NEXT_PUBLIC_SITE_URL}/auth/callback`.
- **OTP verify (6-digit):** Client-only `supabase.auth.verifyOtp({ email, token, type: 'email' })` inside `JoinClient`. Server helper `handleVerify` also supports email but isn’t called by join UI.
- **Session persistence:** After client verification, Supabase session exists in browser storage. Cookie sync relies on `getSupabaseBrowser()` hook that asynchronously POSTs to `/api/auth/sync` on `SIGNED_IN`/`TOKEN_REFRESHED` events.
- **Server cookie write:** `/api/auth/sync` writes cookies when POSTed. No dedicated server route is called during join verification.
- **Final redirect:** Join email verify pushes to `/onboard?src=join`; `/auth/callback` defaults to same `next` query (unless provided).

_Client email OTP verify runs entirely in browser and redirects immediately after Supabase returns a session._
```tsx
// app/join/JoinClient.tsx (lines 176-214)
const { data, error } = await supabase.auth.verifyOtp({
  email: emailSentTo,
  token: emailCode,
  type: 'email',
});
if (error) throw new Error(error.message || 'Invalid or expired code.');
if (!data?.session) throw new Error('No session returned. Please try again.');
router.replace('/onboard?src=join');
router.refresh();
```

## Phone OTP Path (Today)
- **OTP send:** `supabase.auth.signInWithOtp({ phone: normalized, options: { channel: 'sms' } })` invoked in `JoinClient` and `/api/otp/send`. Client normalization ensures +977 local numbers; server helper enforces `+977` prefix and returns 422 otherwise.
- **OTP verify:** Client uses `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` and immediately redirects to `/dashboard`. Server helper `/api/otp/verify` exists but UI does not call it.
- **Server cookie write:** Only occurs indirectly when browser Supabase client posts to `/api/auth/sync` after auth state change. `/api/otp/verify` would set cookies if adopted, but current client path does not touch it.
- **Phone normalization:** Client `normalizeNepalPhone` accepts `+97798…` or local `98…` and converts to `+977…`; server `normalizeNp`/`handleSend` allow `+9779[78]…` and local digits, ensuring match on both send & verify.
- **Final redirect:** `router.replace('/dashboard')` immediately after verify.

_Client SMS OTP verify redirects to `/dashboard` without awaiting cookie sync._
```tsx
// app/join/JoinClient.tsx (lines 125-150)
const { data, error } = await supabase.auth.verifyOtp({
  phone: phoneSentTo,
  token: phoneCode,
  type: 'sms',
});
if (error) throw new Error(error.message || 'Invalid or expired code.');
if (!data?.session) throw new Error('Could not establish session. Please try again.');
router.replace('/dashboard');
router.refresh();
```

## Middleware / Guards
- **Middleware:** `middleware.ts` protects `/dashboard`, `/onboard`, `/people`. It checks for Supabase cookies (`sb-access-token`, `sb-refresh-token`, or legacy `sb:token`). Missing cookies trigger redirect to `/login?next=…` (with original path + query). Requests carrying `?code=` bypass guard so Supabase can finish callbacks.

_Middleware redirects to `/login?next=…` when Supabase cookies are absent._
```ts
// middleware.ts (lines 5-47)
if (!isSignedIn(req)) {
  const login = new URL('/login', url);
  login.searchParams.set('next', pathname + (search || ''));
  return NextResponse.redirect(login, { headers: debugHeaders('redirect:login', pathname) });
}
```

- **Protected layout:** `app/(protected)/layout.tsx` also guards server-rendered routes, calling `getSupabaseServer().auth.getUser()` and `redirect('/login?next=/dashboard')` when no user is returned. This runs after middleware and depends on server cookies being present.

_Server layout enforces login if Supabase server client has no user._
```tsx
// app/(protected)/layout.tsx (lines 7-16)
const supa = getSupabaseServer();
const { data: { user } } = await supa.auth.getUser();

if (!user) {
  redirect('/login?next=/dashboard');
}
```

## Aakash Hook (Current)
- **Endpoint:** Uses Aakash SMS v4 JSON API with `auth-token` header (`AAKASH_SMS_BASE_URL` default `https://sms.aakashsms.com/sms/v4/send-user`).
- **Input handling:** Accepts JSON, extracts phone from numerous Supabase hook shapes (`auth_event.actor_username`) and OTP/message fields. Converts to `+9779…` and then local 10-digit for downstream.
- **Responses:** Always HTTP 200 with `{ ok: true }` or `{ ok: false, reason }`; never signals failure via status code.
- **Phone extraction:** Reads `auth_event.actor_username` when provider is `phone`, matching Supabase hook payload.

## Env & Domain
- **NEXT_PUBLIC_SITE_URL:** Read in `/api/otp/send` and `lib/otp.ts` to build email redirect URLs; must reflect the deployed host (e.g., `https://www.gatishilnepal.org`).
- **Supabase URL & anon key:** Browser/client helpers (`lib/supabase/browser.ts`, `lib/supabase/client.ts`) rely on `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; server helpers (`lib/supabase/server.ts`, `lib/otp.ts`) also read the same pair (plus `SUPABASE_URL`/`SUPABASE_ANON_KEY` when provided).
- **SMS env:** `AAKASH_SMS_BASE_URL`, `AAKASH_SMS_API_KEY`, `AAKASH_SENDER_ID`, `DEBUG_SMS_HOOK` consumed inside `/api/hooks/send-sms`.

## Findings
- **Email OTP cookies are written only after `/api/auth/sync` completes.** `JoinClient` and `/auth/callback` redirect immediately after calling `fetch('/api/auth/sync', …)` or relying on `onAuthStateChange`; any navigation that fires before the server call finishes leaves no Supabase cookies, so protected pages/middleware redirect to `/login?next=…`.
- **Phone OTP flow has the same race.** Client verifies via Supabase JS and immediately `router.replace('/dashboard')`. If middleware runs before `lib/supabase/browser.ts` finishes syncing cookies, the user hits `/login?next=/dashboard`.
- **Server-side OTP verify endpoints exist but UI bypasses them.** `/api/otp/verify` (and `handleVerify`) would set cookies synchronously during verification, preventing the race, but `JoinClient` does not call them.
- **Guards rely solely on cookies.** Both middleware and protected layout ignore client-side session state, so they send users to `/login` whenever cookies are missing—even if the browser Supabase client already holds a session token.
- **Aakash hook is aligned with Supabase (v4, `auth-token`, JSON) and never breaks callbacks.** No 4xx responses to Supabase.
- **Email redirect origins differ.** `/api/otp/send` uses `${NEXT_PUBLIC_SITE_URL}/auth/callback` while `JoinClient` uses `${window.location.origin}/onboard?src=join`, so production must ensure `NEXT_PUBLIC_SITE_URL` matches the public host to avoid mixed domains.

## Minimal Fix Options
- **A:** Adopt the existing `/api/otp/verify` (or similar server route) for phone verification so cookies are written before redirect.
- **B:** Move email magic link handling server-side (e.g., `/auth/callback/route.ts`) to exchange codes and set cookies before redirecting, eliminating the `/api/auth/sync` dependency.
- **C:** Keep `/api/auth/sync` but ensure it accepts both payload shapes (already implemented) and await it before redirecting so cookies exist when hitting middleware.
- **D:** Delay or hide links/buttons to protected routes until `supabase.auth.getSession()` resolves and cookies sync, preventing premature navigation that lands on `/login?next=…`.
