// app/api/auth/sync/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

function getServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const access_token: string | undefined = body?.access_token;
    const refresh_token: string | undefined = body?.refresh_token;

    if (!access_token) {
      return NextResponse.json(
        { ok: false, error: 'Missing access_token' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 401 }
      );
    }

    const { data: userData } = await supabase.auth.getUser().catch(() => ({ data: null }));
    return NextResponse.json({ ok: true, user: userData?.user ?? null });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Auth sync failed' },
      { status: 500 }
    );
  }
}
