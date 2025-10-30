// app/api/i18n/auto/route.ts
import { NextResponse, NextRequest } from 'next/server';

export const runtime = 'edge';

type Lang = 'en' | 'np';

// Map Accept-Language like "ne-NP" → "np", otherwise default to "en".
function detectLangFromHeader(al?: string): Lang {
  if (!al) return 'en';
  const lc = al.toLowerCase();

  // Treat Nepali tags as np (some browsers send "ne" or "ne-np")
  if (/\b(ne|ne-np|ne_np|np)\b/.test(lc)) return 'np';

  // Explicit English tags
  if (/\b(en|en-us|en-gb)\b/.test(lc)) return 'en';

  // Fallback: prefer Nepali if clearly present anywhere
  if (lc.includes('ne') || lc.includes('np')) return 'np';

  return 'en';
}

export async function POST(req: NextRequest) {
  try {
    // Optional JSON payload can override language explicitly: { "override": "en" | "np" }
    let override: Lang | undefined;
    try {
      const body = await req.json().catch(() => null);
      if (body && (body.override === 'en' || body.override === 'np')) {
        override = body.override;
      }
    } catch {
      // ignore malformed JSON; proceed using headers
    }

    const acceptLang = req.headers.get('accept-language') ?? undefined;
    const chosen: Lang = override ?? detectLangFromHeader(acceptLang);

    const res = NextResponse.json({ ok: true, lang: chosen });

    // Set a robust cookie for 1 year
    res.cookies.set({
      name: 'lang',
      value: chosen,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch {
    // Never leak a 500 to the client; respond gracefully and still set a cookie
    const res = NextResponse.json({ ok: false, lang: 'en' as Lang, error: 'fallback' }, { status: 200 });
    res.cookies.set({
      name: 'lang',
      value: 'en',
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  }
}

export function GET() {
  // Optional: allow GET for quick manual checks
  return NextResponse.json({ ok: true, message: 'POST here to set lang cookie (en|np).' });
}
