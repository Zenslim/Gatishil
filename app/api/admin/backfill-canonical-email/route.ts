import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * Admin helper (server-only): set a canonical email for users who lack one.
 * POST body: { userIds: string[] }
 * For each userId with empty email, sets `{userId}@gn.local`.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { userIds } = (await req.json().catch(() => ({}))) as { userIds?: string[] };
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Provide userIds[]' }, { status: 400 });
    }
    const svc = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const results: any[] = [];
    for (const id of userIds) {
      const { data: u } = await svc.auth.admin.getUserById(id);
      const current = u?.user?.email || '';
      if (current) { results.push({ id, status: 'exists', email: current }); continue; }
      const synthetic = `${id}@gn.local`;
      const { error: updErr } = await svc.auth.admin.updateUserById(id, { email: synthetic });
      if (updErr) results.push({ id, status: 'error', message: updErr.message });
      else results.push({ id, status: 'updated', email: synthetic });
    }
    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}