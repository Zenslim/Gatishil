import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

type LegacyTokenPayload = {
  access_token?: string;
  refresh_token?: string;
};

const getLegacyTokens = (raw: string | undefined | null): LegacyTokenPayload | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LegacyTokenPayload;
    if (typeof parsed?.access_token === 'string' && parsed.access_token.length > 0) {
      return parsed;
    }
  } catch {
    // Ignore JSON parse errors
  }
  return null;
};

export function getServerSupabase() {
  const cookieStore = cookies();
  const legacy = getLegacyTokens(cookieStore.get('supabase-auth-token')?.value);

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        const direct = cookieStore.get(name)?.value;
        if (direct) return direct;

        if (legacy) {
          if (name === 'sb-access-token') {
            return legacy.access_token ?? undefined;
          }
          if (name === 'sb-refresh-token') {
            return legacy.refresh_token ?? undefined;
          }
        }
        return undefined;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });
}
