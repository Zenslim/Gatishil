// app/api/otp/send/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Very forgiving normalizer: accepts multiple shapes
function normalize(body: any) {
  const raw = body ?? {};
  const contact: string | undefined =
    raw.contact ?? raw.identifier ?? raw.value ?? raw.email ?? raw.phone;

  // explicit type if provided
  let type: 'sms' | 'email' | undefined = raw.type;
  if (type && type !== 'sms' && type !== 'email') {
    // allow aliases like 'phone', 'tel', 'mail'
    if (String(type).toLowerCase() === 'phone' || String(type).toLowerCase() === 'tel') type = 'sms';
    else if (String(type).toLowerCase() === 'mail') type = 'email';
    else type = undefined;
  }

  // infer from contact if needed
  if (!type && contact) {
    type = contact.includes('@') ? 'email' : 'sms';
  }

  // if explicit email/phone fields exist, prefer them
  const email: string | undefined = raw.email ?? (type === 'email' ? contact : undefined);
  const phone: string | undefined = raw.phone ?? (type === 'sms' ? contact : undefined);

  // default mode is 'otp' (6-digit code). 'magic' sends a magic link
  const mode: 'otp' | 'magic' = (raw.mode === 'magic' ? 'magic' : 'otp');

  // optional redirect target for magic link
  const redirectTo: string | undefined =
    raw.redirectTo ?? process.env.NEXT_PUBLIC_MAGIC_REDIRECT_URL ?? 'https://www.gatishilnepal.org/onboard?src=join';

  return { type, email, phone, mode, redirectTo, _debug: { receivedKeys: Object.keys(raw) } };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type, email, phone, mode, redirectTo, _debug } = normalize(body);

    if (type !== 'sms' && type !== 'email') {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid type',
          hint: "Send { type:'sms', phone:'+97798…' } OR { type:'email', email:'you@example.com', mode:'otp'|'magic' }",
          received: _debug,
        },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
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

    if (type === 'sms') {
      if (!phone) {
        return NextResponse.json(
          { ok: false, error: 'Missing phone', hint: "Provide { phone: '+97798…' }" },
          { status: 400 }
        );
      }

      // Minimal E.164-ish normalization: prepend '+977' if it looks like a local Nepal mobile
      let phoneE164 = phone.trim();
      if (/^9\d{8}$/.test(phoneE164)) phoneE164 = `+977${phoneE164}`;
      if (!phoneE164.startsWith('+')) {
        return NextResponse.json(
          { ok: false, error: 'Phone must be E.164 (+CCxxxxxxxxxx)', received: phone },
          { status: 400 }
        );
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneE164,
        options: { channel: 'sms' },
      });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, channel: 'sms' });
    }

    // EMAIL branch
    if (!email) {
      return NextResponse.json(
        { ok: false, error: 'Missing email', hint: "Provide { email: 'you@example.com' }" },
        { status: 400 }
      );
    }

    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, channel: 'magic', redirectTo });
    }

    // mode === 'otp'
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, channel: 'email_otp' });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'OTP send failed' },
      { status: 500 }
    );
  }
}
