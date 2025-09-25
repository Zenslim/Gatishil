FORCE API ROUTES PATCH

Replace/add these files:
- next.config.js
- vercel.json
- app/api/hello/route.ts
- app/api/people/route.ts
- app/page.tsx
- app/people/page.tsx
- (and the same under src/app/... in case your repo uses /src)

Why this patch?
- Ensures you have App Router files regardless of whether your project uses `/app` or `/src/app`.
- Adds `/api/hello` to quickly verify API routes are deployed (should return {"ok":true}).
- Adds `/api/people` with runtime guards; returns 500 if envs missing instead of 404.
- Prevents static export that would remove API routes.

After commit & redeploy:
1) Open /api/hello → must return JSON. If 404, your Root Directory is wrong or these files aren't in the deployed tree.
2) Open /api/people → should return JSON (200 empty or 500 if envs missing). 404 means route not deployed.
3) Open /people → page must render.

If still 404:
- Vercel → Settings → General → Root Directory: must point to folder that contains `package.json` and the new `app/` folder.
- Ensure no Vercel project-level rewrites that intercept `/api/*`.
- Confirm build logs list routes. If not, paste commit hash and I'll tailor paths to your repo layout.