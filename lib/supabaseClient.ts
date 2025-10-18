// lib/supabaseClient.ts (shim)
// Provide a ready-to-use browser client for components that expect `supabase`.
import { getSupabaseBrowser } from '@/lib/supabase/browser';
export const supabase = getSupabaseBrowser();
