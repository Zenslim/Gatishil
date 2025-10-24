// app/api/auth/sync/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic'; // ensure no caching interferes

// Accept raw tokens from the client and persist official Supabase HttpOnly cookies.
export async function POST(req: Request) {
  try {
    const { access_token, refresh_token } = await req.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: 'Missing access_token or refresh_token' },
        { status: 400 }
      );
    }

    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // Use getAll/setAll — required by @supabase/ssr cookie adapter
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            for (const cookie of cookiesToSet) {
              cookieStore.set(cookie);
            }
          },
        },
      }
    );

    // Setting the session here rotates/validates tokens and writes sb-* cookies.
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Optional sanity check — forces cookie write-through on some edge cases
    const { data, error: getErr } = await supabase.auth.getSession();
    if (getErr || !data.session) {
      return NextResponse.json(
        { error: getErr?.message ?? 'Session not available after setSession' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'sync failed' },
      { status: 400 }
    );
  }
}
