import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Accepts client-side tokens and writes the official Supabase HttpOnly cookies
 * (sb-access-token / sb-refresh-token) so middleware/SSR can see the session.
 */
export async function POST(req: Request) {
  try {
    const { access_token, refresh_token } = await req.json().catch(() => ({}));
    if (!access_token) {
      return NextResponse.json({ error: 'Missing access_token' }, { status: 400 });
    }

    const cookieStore = cookies();

    // Use public URL + anon key. @supabase/ssr will attach Set-Cookie headers.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: () => cookieStore }
    );

    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token: typeof refresh_token === 'string' ? refresh_token : undefined,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Success → HttpOnly cookies were written to the response.
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'sync failed' },
      { status: 400 }
    );
  }
}
