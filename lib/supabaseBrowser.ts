import { getSupabaseBrowser } from '@/lib/supabase/browser';

// Compatibility re-export for older imports
export { supabase as supabaseBrowser, getSupabaseBrowser } from '@/lib/supabase/browser';

export const getBrowserSupabase = getSupabaseBrowser;
