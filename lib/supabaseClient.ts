// lib/supabaseClient.ts
// Safe client that works in SSR/preview and PROD.
// Exports BOTH default and named 'supabase' so existing imports don't break.

import type { SupabaseClient } from "@supabase/supabase-js";

let realClient: SupabaseClient | null = null;

try {
  // Only build the real client in the browser when envs exist
  if (typeof window !== "undefined") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anon) {
      // use require to avoid bundling at build time in some SSR paths
      const { createClient } = require("@supabase/supabase-js");
      realClient = createClient(url, anon);
    }
  }
} catch {
  realClient = null;
}

// Minimal no-op chain so .from() never explodes in preview/SSR
const ok = async <T = any>(payload?: T) => ({ data: payload ?? null, error: null });
const chain = {
  select: async () => ok<any[]>([]),
  insert: async () => ok(),
  update: async () => ok(),
  upsert: async () => ok(),
  delete: async () => ok(),
  order() { return this; },
  eq() { return this; },
  neq() { return this; },
  ilike() { return this; },
  limit() { return this; },
};

// Stub client with .from(..) guaranteed
const stubClient: any = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} }}, error: null }),
  },
  from(_table: string) {
    return chain;
  },
};

// Use real if available, otherwise stub
const client: SupabaseClient | any = realClient ?? stubClient;

// Export default AND named so both import styles work
export default client;
export const supabase = client;