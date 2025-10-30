import {
  __serverOnlySupabase__,
  getSupabaseBrowser as exportedGetSupabaseBrowser,
  getSupabaseBrowserClient,
  supabase as exportedSupabase,
} from '@/lib/supabaseClient';

export const getSupabaseBrowser =
  typeof exportedGetSupabaseBrowser === 'function'
    ? exportedGetSupabaseBrowser
    : (...args: any[]) => (getSupabaseBrowserClient as any)(...args);

// Make it available to any legacy code that forgot to import:
(globalThis as any).getSupabaseBrowser ??= getSupabaseBrowser;

// Aliases expected around the app:
export { getSupabaseBrowserClient } from '@/lib/supabaseClient';
export const createServerSupabase = __serverOnlySupabase__;
export const getSupabaseServer = __serverOnlySupabase__;
export const supabase = exportedSupabase;

export default {
  getSupabaseBrowser,
  getSupabaseBrowserClient,
  getSupabaseServer: __serverOnlySupabase__,
  createServerSupabase: __serverOnlySupabase__,
  supabase: exportedSupabase,
};
