# GatishilNepal.org Platform

GatishilNepal.org is a public-facing platform built with Next.js to help the Gatishil Nepal community share updates, gather feedback, and coordinate initiatives. The project combines static marketing content with authenticated member-only experiences powered by Supabase.

## Tech stack

- **Framework:** Next.js 14 App Router with React 18
- **Styling:** Tailwind CSS and PostCSS
- **Data & Auth:** Supabase (Supabase JS + Auth Helpers)
- **Rendering:** Incremental static regeneration-friendly pages with server actions
- **Tooling:** TypeScript, ESLint, and Framer Motion for animations

## Getting started

### Prerequisites

- Node.js 18+
- pnpm, npm, or yarn (examples below use **npm**)
- Supabase project with anon and service role keys

### Installation

```bash
npm install
```

### Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server with hot reload. |
| `npm run build` | Generate an optimized production build. |
| `npm run start` | Launch the production server (after `npm run build`). |
| `npm run lint` | Run ESLint across the codebase. |
| `npm run typecheck` | Validate TypeScript types without emitting files. |

### Environment variables

Create a `.env.local` file and provide the following configuration:

| Variable | Required | Description |
| --- | :---: | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL used by the client and server. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon API key for client-side access. |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ | Service role key for server-side operations (keep secret; not exposed to the browser). |
| `NEXT_PUBLIC_SITE_URL` | ⚠️ | The canonical public URL of the deployed site (used for redirects and metadata). |
| `NEXT_PUBLIC_APP_ORIGIN` | ⚠️ | Origin used by WebAuthn flows. Should match the public domain with protocol. |

> ⚠️ Optional variables are only required for features that depend on them. Missing optional variables may disable related functionality or fail status checks.

### Development workflow

1. Clone the repository and install dependencies.
2. Configure environment variables as described above.
3. Run `npm run dev` and open `http://localhost:3000`.
4. Use `npm run lint` and `npm run typecheck` before committing.

## Deployment

The project is optimized for Vercel. To deploy:

1. Push the repository to GitHub.
2. Create a new Vercel project and import the repository.
3. Set the environment variables in **Vercel → Project → Settings → Environment Variables**.
4. Trigger a deployment; Vercel will run `npm install`, `npm run build`, and host the production build.

For alternative hosting, build with `npm run build` and serve the `.next` output via any Node.js-compatible platform using `npm run start`.

## Documentation & support

- Product requirements and additional docs live under the [`docs/`](docs) directory.
- Use GitHub Issues for bugs or feature requests; see [CONTRIBUTING](CONTRIBUTING.md) for collaboration guidelines.

## Repo Cleanup

- Removed an obsolete duplicate `OnboardingFlow.tsx` entry point in the project root to ensure the App Router imports a single authoritative onboarding flow component.
