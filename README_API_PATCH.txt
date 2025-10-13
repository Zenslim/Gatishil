PATCH: Restore /api/people in App Router

Replace these files:
- next.config.js        (ensures NOT using `output: 'export'`)
- src/lib/db.ts         (lazy Supabase client)
- src/app/api/people/route.ts  (App Router API handler)

Checklist after commit:
1) Vercel → Build Logs → Verify a line like `● /api/people` (route is registered).
2) Confirm your Root Directory points to the folder containing package.json.
3) Confirm you’re using App Router: files under `src/app/...` exist in the build output.
4) Ensure no rewrites/redirects intercept `/api/*` in next.config.js or Vercel project settings.
5) Set env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.