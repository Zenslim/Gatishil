// Consolidated exports used across the codebase.
// For browser-side usage:
export { supabase } from '@/lib/supabase/browser';
// For server-side usage in route handlers / RSC:
export { getServerSupabase } from '@/lib/supabase/server';
// Legacy alias expected by existing API routes:
export { getServerSupabase as getSupabase } from '@/lib/supabase/server';
