// lib/spine.ts
// One Human Spine — tiny client helpers for Next.js 14 (App Router) + Supabase SSR

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

function createClient(): SupabaseClient {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('Supabase client credentials missing');
  }

  return createServerClient(
    url,
    anon,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set?.(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set?.(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );
}

/**
 * Reads the current user's profile + identities (uses SECURITY DEFINER RPC)
 * Returns null if not signed in.
 */
export async function getMeProfile() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase.rpc("me_profile");
  if (error) throw error;

  // Shape: { user_id, person_id, email, phone, atmadisha_json, identities: [{type,value,verified}, ...] }
  return data?.[0] ?? null;
}

/**
 * Adds an identity (email or phone) to the current person.
 * Note: verification is handled by Supabase Auth flow; this only records it in the spine.
 */
export async function addIdentity(
  type: "email" | "phone",
  value: string
): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { error } = await supabase.rpc("add_identity", {
    p_type: type,
    p_value: value,
  });
  if (error) throw error;
}
