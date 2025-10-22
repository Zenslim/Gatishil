"use server";

import { cookies, headers } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient as createBasicClient, SupabaseClient } from "@supabase/supabase-js";

export function createRouteClient(): ReturnType<typeof createServerComponentClient> {
  // Uses auth-helpers to bind to Next.js cookies for session set on server
  return createServerComponentClient({ cookies });
}

export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createBasicClient(url, key, { auth: { persistSession: false } });
}

export function createAnonClientForCookies(): SupabaseClient {
  // Anon client that will set session cookies through auth-helpers cookie jar
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBasicClient(url, key, {
    auth: {
      persistSession: false,
      // We won't persist here; auth-helpers manages cookies on the response
    },
    global: {
      headers: Object.fromEntries(headers().entries()),
    },
  });
}