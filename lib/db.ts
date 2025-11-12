// lib/db.ts
import { supabaseServer } from "@/lib/supabase/server";

// Canonical export
export { supabaseServer };

// Back-compat aliases used elsewhere in the codebase
export const getSupabaseServer = supabaseServer;
export const getServerSupabase = supabaseServer;
export const getSupabase = supabaseServer;
