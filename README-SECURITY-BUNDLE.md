
# /security: Password + Passkey (App Router, no `src/`)

**Flow**
1) User logs in once with OTP → lands on `/members`.
2) They visit `/security` to set a password and add a passkey.
3) Next time: sign in with passkey (one tap) or password; OTP remains backup.

**What’s included**
- `app/security/page.tsx` – UI to set password + register & test passkey
- `app/api/webauthn/**` – Dynamic API routes using @simplewebauthn
- `sql/webauthn_setup.sql` – Tables + strict RLS (service-role only)

**Environment (Vercel → Project → Settings → Environment Variables)**
- `NEXT_PUBLIC_SITE_URL` = `https://gatishil.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Server only)

**Dependencies (package.json)**
- `@simplewebauthn/browser` ^9
- `@simplewebauthn/server`  ^9

**Notes**
- Client sends `Authorization: Bearer <access_token>` to server so the API can bind the passkey to the correct user without SSR cookies.
- API routes are `dynamic` and create Supabase admin client inside handlers to avoid build-time env access.
