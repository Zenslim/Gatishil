# TrustStep — Ask for Passkey (or PIN) After Introductions

This bundle adds a **Trust Step** AFTER Ātma Diśā in your onboarding:

```
entry → name → roots → atmadisha → trust → dashboard
```

## What’s inside

- `components/onboard/TrustStep.jsx` — UI that offers **Passkey** (WebAuthn) or **PIN** fallback, or **Skip**.
- `app/api/webauthn/authn/options/route.ts` — Issues WebAuthn **registration options** (challenge).
- `app/api/webauthn/authn/verify/route.ts` — Verifies WebAuthn registration and stores credential in Supabase.
- `lib/webauthn.ts` — Relying Party config + challenge handling (MVP in-memory).
- `lib/localPin.ts` — Local-only PIN fallback using WebCrypto (AES-GCM, PBKDF2).
- `supabase/migrations/webauthn_credentials.sql` — Credential table + RLS.
- `PATCH-OnboardingFlow.after-AtmaDisha.txt` — Exact code patch snippet for your `components/OnboardingFlow.tsx`.

## Install

```bash
npm i @simplewebauthn/server @simplewebauthn/browser
```

## Environment (Vercel → Project Settings → Environment Variables)

```
RP_ID=your-domain.tld                 # e.g. gatishil.vercel.app (no scheme, no port)
RP_NAME=Chautari
NEXT_PUBLIC_APP_ORIGIN=https://your-domain.tld
```

## Apply the patch

Edit `components/OnboardingFlow.tsx` to:
1) Import TrustStep
2) Change AtmaDisha `onDone` → `go('trust')`
3) Add the `if(step === 'trust')` block

See `PATCH-OnboardingFlow.after-AtmaDisha.txt` for the exact lines.

## Test

- Sign in via `/join`, complete Name → Roots → Ātma Diśā → **Trust**.
- Try **Create Passkey** on a modern phone/desktop (biometrics).
- On a device that lacks WebAuthn, use **Create PIN** (local only).
- Try **Skip**. You should reach the dashboard and still be able to use OTP next time.

## Notes

- This MVP keeps WebAuthn registration **only**. Passkey **login** (assertion) can be added later with
  `/api/webauthn/assert/options` + `/api/webauthn/assert/verify`.
- PIN fallback stores an **encrypted device secret** locally. Your PIN is never sent to the server.
