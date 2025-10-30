// Single source of truth for Supabase clients.
// We re-export the browser/server getters from the existing supabaseClient util
// to avoid accidental imports from '@/lib/supabase/browser' which don't exist.

export { getSupabaseBrowserClient as getSupabaseBrowser } from '@/lib/supabaseClient';
export { getSupabaseServerClient as getSupabaseServer } from '@/lib/supabaseClient';
