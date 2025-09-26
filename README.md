# Gatishil — Phone‑First Sign‑In Upgrade (One-Step)

**Do exactly this:** Replace your GitHub repo’s `app/join/page.tsx` with the file in this zip, then delete the `app/people` folder (keep `app/members`). Commit to `main` — Vercel auto‑deploys. After deploy, open Supabase SQL editor and run the included `sql/01_people_phone_unique.sql` once.

This keeps your current email magic link as fallback, adds **SMS OTP** (phone‑first), and writes the member to `public.people` (name, role, phone/email, created_by).