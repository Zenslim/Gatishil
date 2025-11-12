import { supabaseServer } from "@/lib/supabase/server";

/**
 * Ensures a valid Supabase session in server routes.
 * Throws if unauthenticated. Used in API handlers or server components.
 */
export async function requireSessionUser() {
  const supabase = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("UNAUTHENTICATED");
  }

  return user;
}
