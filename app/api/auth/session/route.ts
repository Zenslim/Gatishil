// app/api/auth/session/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = supabaseServer();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      return NextResponse.json({ authenticated: false, error: 'no-user' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ authenticated: Boolean(user) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ authenticated: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
