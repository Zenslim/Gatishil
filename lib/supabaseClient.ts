// lib/supabaseClient.ts
// Always export a safe client. In non-configured/SSR cases we export a stub
// that has .from() and no-ops all query methods so callers never crash.

import type { SupabaseClient } from "@supabase/supabase-js";

let realClient: SupabaseClient | null = null;

try {
  // Only attempt to build the real client when we're in a browser
  // AND the required env vars are present.
  if (typeof window !== "undefined") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anon) {
      const { createClient } = require("@supabase/supabase-js");
      realClient = createClient(url, anon);
    }
  }
} catch (_) {
  realClient = null;
}

// Minimal query object used by the stub to avoid ".from is undefined"
const ok = async (payload: any = null) => ({ data: payload, error: null });
const chain = {
  select: async () => ok([]),
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

// Safe stub client with a .from() that never throws
const stubClient: any = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} }}, error: null }),
  },
  from(_table: string) {
    return chain;
  },
};

// Export the real client if available, otherwise the stub.
// Callers can safely do supabase.from(...).select(...) without ever crashing.
const supabase: SupabaseClient | any = realClient ?? stubClient;
export default supabase;