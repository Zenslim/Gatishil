# Deployment environment variables

This project deploys on Vercel and relies on Supabase. The table below shows the variables that must be configured and where each one should live.

| Variable | Scope | Set in Vercel | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Preview + Production | **Project Settings → Environment Variables → Preview/Production** | Safe to expose, corresponds to your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview + Production | **Project Settings → Environment Variables → Preview/Production** | Public anonymous key used by the browser client. |
| `SUPABASE_SERVICE_ROLE_KEY` | Production only | **Project Settings → Environment Variables → Production** | Server-only secret. Never add this to Preview or Development. |

## How Vercel consumes them

`vercel.json` configures separate Preview and Production environments. Preview deploys only receive public Supabase values, ensuring that long-lived secrets stay out of client bundles. Production deploys receive the same public keys plus `SUPABASE_SERVICE_ROLE_KEY` for API routes and server utilities. Local development should use a `.env.local` file with the same variable names.

When updating secrets:

1. Generate or rotate keys in the Supabase dashboard.
2. Run `vercel env add <NAME>` to create or update the corresponding secret (e.g. `vercel env add supabase-url`), or edit the Project Settings UI.
3. Confirm the aliases referenced in `vercel.json` (`@supabase-url`, `@supabase-anon-key`, etc.) match the secrets you created.
4. Re-deploy so the new values propagate to the runtime.

Never commit Supabase keys (especially the service role key) to Git. If a service key was ever exposed to the client, revoke it immediately and update Vercel.
