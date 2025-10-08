import 'server-only';
import { createClient } from '@supabase/supabase-js';

type ServerEnvKey = 'NEXT_PUBLIC_SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY';

function assertServerRuntime() {
  if (typeof window !== 'undefined') {
    throw new Error('getAdminSupabase must only be used on the server.');
  }
}

function getServerEnv(key: ServerEnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env: ${key}`);
  }
  return value;
}

export function getAdminSupabase() {
  assertServerRuntime();
  const url = getServerEnv('NEXT_PUBLIC_SUPABASE_URL');
  const service = getServerEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, service, { auth: { persistSession: false } });
}
