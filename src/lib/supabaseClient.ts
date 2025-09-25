import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// In case envs aren’t set yet, export a null client (API falls back to demo)
export const supabase =
  url && anon ? createClient(url, anon, { auth: { persistSession: false } }) : null;