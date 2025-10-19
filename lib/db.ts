// lib/db.ts
import { getSupabaseServer } from '@/lib/supabase/server';

// Canonical export
export { getSupabaseServer };

// Back-compat aliases used elsewhere in the codebase
export const getServerSupabase = getSupabaseServer;
export const getSupabase = getSupabaseServer;
