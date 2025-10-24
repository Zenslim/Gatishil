import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieDescriptor = {
  name: string;
  value: string;
  options?: CookieOptions;
};

type SupabaseWithCommit = ReturnType<typeof createServerClient> & {
  commitCookies: (response?: NextResponse) => void;
};

function normaliseOptions(options?: CookieOptions) {
  return {
    ...options,
    path: options?.path ?? '/',
    httpOnly: options?.httpOnly ?? true,
    sameSite: (options?.sameSite as CookieOptions['sameSite']) ?? 'lax',
    secure: options?.secure ?? true,
  } satisfies CookieOptions;
}

export function getSupabaseServer(resp?: NextResponse): SupabaseWithCommit {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error('Missing Supabase env');

  const store = cookies();
  const pending: CookieDescriptor[] = [];

  const queueSet = (name: string, value: string, options?: CookieOptions) => {
    pending.push({ name, value, options: normaliseOptions(options) });
  };

  const queueRemove = (name: string, options?: CookieOptions) => {
    pending.push({
      name,
      value: '',
      options: {
        ...normaliseOptions(options),
        maxAge: 0,
        expires: new Date(0),
      },
    });
  };

  const supabase = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      getAll() {
        return store.getAll().map(({ name, value }) => ({ name, value }));
      },
      set(name: string, value: string, options?: CookieOptions) {
        queueSet(name, value, options);
      },
      setAll(cookieList: CookieDescriptor[]) {
        for (const { name, value, options } of cookieList) {
          queueSet(name, value, options);
        }
      },
      remove(name: string, options?: CookieOptions) {
        queueRemove(name, options);
      },
      delete(name: string, options?: CookieOptions) {
        queueRemove(name, options);
      },
    },
  });

  const commitCookies = (response?: NextResponse) => {
    if (pending.length === 0) return;
    const target = response?.cookies ?? resp?.cookies;

    if (target) {
      for (const { name, value, options } of pending) {
        target.set({ name, value, ...options });
      }
    } else {
      const fallback = cookies();
      for (const { name, value, options } of pending) {
        fallback.set({ name, value, ...options });
      }
    }

    pending.length = 0;
  };

  return Object.assign(supabase, { commitCookies });
}
