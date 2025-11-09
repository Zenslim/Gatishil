// app/api/auth/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs'; // stable SSR + cookie adapter

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Session presence probe:
 * - 204 if Supabase auth cookies yield a valid session
 * - 401 if not
 * No request body. No token passthrough. No setSession.
 */
const getSupabaseSSR = (req: NextRequest, res: NextResponse) =>
  createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options: any) => {
        res.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: any) => {
        res.cookies.set({ name, value: '', ...options });
      },
    },
  });

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export function GET() {
  return new NextResponse('Use POST', { status: 405 });
}

export async function POST(req: NextRequest) {
  try {
    const res = new NextResponse(null, { status: 204 });
    const supabase = getSupabaseSSR(req, res);

    const { data, error } = await supabase.auth.getSession();
    if (error) return NextResponse.json({ error: 'Auth read failed' }, { status: 500 });
    if (!data?.session) return NextResponse.json({ error: 'No session' }, { status: 401 });

    return res; // 204, cookies already on response
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
