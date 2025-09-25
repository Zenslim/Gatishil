# Gatishil — One Ledger (6 Registers)

This is a clean, remote-only stack: **GitHub + Vercel + Supabase**.

- People, Orgs, Projects, Money, Knowledge, Polls/Proposals pages
- `/api/hello` and `/api/people` routes
- Supabase-ready (RLS). If tables don’t exist yet, People page shows safe demo data so the site never breaks.

## Environment
Copy `.env.example` → Vercel Project → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

(Optionally add `SUPABASE_SERVICE_ROLE` later for admin tasks—*not required* for read-only People.)

## Supabase SQL (run once when ready)
Open Supabase SQL Editor and run `sql/postgres.sql` to create `people` table + RLS.

## Routes
- `/` Home
- `/people` People register (Supabase-backed; graceful demo fallback)
- `/orgs`, `/projects`, `/money`, `/knowledge`, `/polls`, `/proposals` (stubs ready)

APIs:
- `/api/hello`
- `/api/people`

That’s it. Commit → Vercel deploys → live.