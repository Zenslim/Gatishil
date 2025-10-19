import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: Request) {
  const host = req.headers.get('host') || null;
  const ck = cookies();

  // Read cookies present on the current host
  const allCookies = ck.getAll().map(c => ({ name: c.name, len: (c.value ?? '').length }));

  // Modern cookies
  const sbAccess = ck.get('sb-access-token')?.value || null;
  const sbRefresh = ck.get('sb-refresh-token')?.value || null;

  // Legacy JSON cookie
  let legacyRaw: string | null = ck.get('supabase-auth-token')?.value || null;
  let legacyParsed: any = null;
  let legacyParseOk = false;
  try {
    if (legacyRaw) {
      legacyParsed = JSON.parse(legacyRaw);
      legacyParseOk = typeof legacyParsed?.access_token === 'string';
    }
  } catch { legacyParseOk = false; }

  // Build a Supabase server client that can fall back to legacy values
  const effectiveAccess = sbAccess || (legacyParseOk ? legacyParsed.access_token : null);
  const effectiveRefresh = sbRefresh || (legacyParseOk ? legacyParsed.refresh_token ?? null : null);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (name === 'sb-access-token' && effectiveAccess) return effectiveAccess;
          if (name === 'sb-refresh-token' && effectiveRefresh) return effectiveRefresh;
          return ck.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const { data: sessData, error: sessErr } = await supabase.auth.getSession();

  return NextResponse.json({
    host,
    allCookies,
    has_sb_access: !!sbAccess,
    has_sb_refresh: !!sbRefresh,
    has_legacy: !!legacyRaw,
    legacy_parse_ok: legacyParseOk,
    legacy_keys_present: legacyParseOk ? {
      access_token: typeof legacyParsed?.access_token === 'string',
      refresh_token: typeof legacyParsed?.refresh_token === 'string',
    } : null,
    supabase: {
      user_id: userData?.user?.id ?? null,
      session_present: !!sessData?.session,
      user_error: userErr?.message ?? null,
      session_error: sessErr?.message ?? null,
    },
  }, { status: 200 });
}
