// lib/supabaseBrowser.ts
// Compatibility shim for legacy imports. Do not call on the server.
export { supabaseBrowser } from '@/lib/supabase/browser';
export const supabase = supabaseBrowser;            // legacy alias
export const getSupabaseBrowser = supabaseBrowser;  // legacy alias
