// lib/env.ts
// Runtime validation for required public env vars and helpers for server secrets
export const requireEnv = (key: string, isPublic = false): string => {
  const v = process.env[key];
  if (!v || !v.trim()) {
    const scope = isPublic ? "public" : "server";
    throw new Error(`[env] Missing ${scope} env: ${key}`);
  }
  return v;
};

// Public (safe to expose to client) — must be prefixed with NEXT_PUBLIC_
export const NEXT_PUBLIC_SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL", true);
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", true);
