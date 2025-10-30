// Unified Supabase exports used across the app.
// We adapt to what's actually exported by '@/lib/supabaseClient' so other files can import stable names.
//
// Existing available exports there (per build logs):
//   - __serverOnlySupabase__
//   - getSupabaseBrowser
//   - getSupabaseBrowserClient
//   - supabase
//
// We provide the symbols other modules expect:
//   - createServerSupabase (alias of __serverOnlySupabase__)
//   - getSupabaseBrowser (re-export)
//   - getSupabaseBrowserClient (re-export)
//   - supabase (re-export)

export { getSupabaseBrowser, getSupabaseBrowserClient, supabase } from '@/lib/supabaseClient';
export { __serverOnlySupabase__ as createServerSupabase } from '@/lib/supabaseClient';

// If some code imports getSupabaseServer, expose the same server alias:
export { __serverOnlySupabase__ as getSupabaseServer } from '@/lib/supabaseClient';
