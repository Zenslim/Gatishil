# Gatishil Security Add-on (App Router, no `src/`)

**What you get**
- `/app/security/page.tsx` – one-time password + passkey setup after OTP.
- `/app/api/webauthn/*` – server routes for WebAuthn (SimpleWebAuthn).
- `sql/webauthn_setup.sql` – run once in Supabase SQL editor.
- No `src/` folder. Pure App Router structure.

**Env (Vercel → Project → Settings → Environment Variables)**
- `NEXT_PUBLIC_SITE_URL` = `https://<your-domain>`
- `NEXT_PUBLIC_SUPABASE_URL` = your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key
- `SUPABASE_SERVICE_ROLE_KEY` = service role key (server only)

**Post-OTP redirect**
After a successful OTP login, redirect users to `/security` one time.

**Sign-in UX**
- First time: OTP → `/security` → set password → register passkey.
- Next time: passkey (one tap) or password. OTP = backup.

**SQL**
Open Supabase → SQL → paste `sql/webauthn_setup.sql` and run.
