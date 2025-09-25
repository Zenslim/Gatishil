import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const service = process.env.SUPABASE_SERVICE_ROLE as string | undefined;

export function getAdminSupabase() {
  if (!url || !service) {
    throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE');
  }
  return createClient(url, service, { auth: { persistSession: false } });
}
