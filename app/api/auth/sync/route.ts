// app/api/auth/sync/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Accept client tokens and write official Supabase HttpOnly cookies
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const access_token: string | undefined = body?.access_token;
    const refresh_token: string | undefined = body?.refresh_token;

    if (!access_token) {
      return NextResponse.json({ error: 'Missing access_token' }, { status: 400 });
    }

    const cookieStore = cookies();

    // NEW: explicit cookie adapter for @supabase/ssr
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            // Next.js doesn’t expose a remove; emulate via an expired cookie
            cookieStore.set({ name, value: '', ...options, maxAge: 0 });
          },
        },
      }
    );

    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || undefined,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // If we got here, Set-Cookie (sb-access-token / sb-refresh-token) is attached.
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'sync failed' }, { status: 400 });
  }
}
