import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieDescriptor = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function getSupabaseServer(resp?: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error('Missing Supabase env');

  const store = cookies();
  const writer = resp ? resp.cookies : store;

  const applySet = (name: string, value: string, options?: CookieOptions) => {
    writer.set({
      name,
      value,
      ...options,
      path: options?.path ?? '/',
      httpOnly: options?.httpOnly ?? true,
      sameSite: (options?.sameSite as CookieOptions['sameSite']) ?? 'lax',
      secure: options?.secure ?? true,
    });
  };

  const applyRemove = (name: string, options?: CookieOptions) => {
    writer.set({
      name,
      value: '',
      ...options,
      path: options?.path ?? '/',
      httpOnly: options?.httpOnly ?? true,
      sameSite: (options?.sameSite as CookieOptions['sameSite']) ?? 'lax',
      secure: options?.secure ?? true,
      maxAge: 0,
      expires: new Date(0),
    });
  };

  const methods = {
    get(name: string) {
      return store.get(name)?.value;
    },
    getAll() {
      return store.getAll().map(({ name, value }) => ({ name, value }));
    },
    set(name: string, value: string, options?: CookieOptions) {
      applySet(name, value, options);
    },
    setAll(cookieList: CookieDescriptor[]) {
      for (const { name, value, options } of cookieList) {
        applySet(name, value, options);
      }
    },
    remove(name: string, options?: CookieOptions) {
      applyRemove(name, options);
    },
    delete(name: string, options?: CookieOptions) {
      applyRemove(name, options);
    },
  } as const;

  return createServerClient(url, anon, {
    cookies: methods,
  });
}
