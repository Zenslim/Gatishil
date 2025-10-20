// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import React from 'react';
import { getSupabaseServer } from '@/lib/supabase/server';
import { isRedirectError } from 'next/dist/client/components/redirect';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AVATAR_HOST_SUFFIXES = ['supabase.co', 'googleusercontent.com'];
const AVATAR_EXACT_HOSTS = new Set(['avatars.githubusercontent.com', 'raw.githubusercontent.com', 'user-images.githubusercontent.com']);

function getSafeAvatarUrl(raw: string | null) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    const hostname = url.hostname.toLowerCase();
    if (AVATAR_EXACT_HOSTS.has(hostname)) return url.toString();
    const ok = AVATAR_HOST_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
    return ok ? url.toString() : null;
  } catch (e) {
    console.warn('dashboard:invalid avatar url', raw, e);
    return null;
  }
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

function ErrorCard({ title, details }: { title: string; details?: string }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
      <div className="font-semibold">{title}</div>
      {details ? <pre className="mt-2 whitespace-pre-wrap text-red-300/90">{details}</pre> : null}
      <div className="mt-3 text-xs text-red-300/80">
        If this persists, try reloading or signing in again. The server has logged the error.
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  try {
    const supabase = getSupabaseServer();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      console.error('dashboard:getUser error', userErr);
      redirect('/login?next=/dashboard');
    }
    if (!user) redirect('/login?next=/dashboard');

    const {
      data: profile,
      error: profileErr,
    } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (profileErr) console.error('dashboard:profiles query error', profileErr);

    const {
      data: link,
      error: linkErr,
    } = await supabase.from('user_person_links').select('person_id').eq('user_id', user.id).maybeSingle();
    if (linkErr) console.error('dashboard:user_person_links query error', linkErr);

    const enriched = {
      idx: profile?.idx ?? null,
      user_id: user.id,
      name: profile?.name ?? null,
      photo_url: profile?.photo_url ?? null,
      roots_json: (profile?.roots_json as any) ?? null,
      updated_at: profile?.updated_at ?? null,
      surname: profile?.surname ?? null,
      vision: profile?.vision ?? null,
      occupation: Array.isArray(profile?.occupation) ? profile?.occupation : [],
      skill: Array.isArray(profile?.skill) ? profile?.skill : [],
      passion: Array.isArray(profile?.passion) ? profile?.passion : [],
      compassion: Array.isArray(profile?.compassion) ? profile?.compassion : [],
      email: user.email ?? null,
      phone: profile?.phone ?? null,
      person_id: link?.person_id ?? profile?.person_id ?? null,
      passkey_enabled: Boolean(profile?.passkey_enabled),
      passkey_cred_ids: Array.isArray(profile?.passkey_cred_ids) ? profile?.passkey_cred_ids : [],
    };

    const rootLabel =
      typeof enriched.roots_json === 'object' && (enriched.roots_json as any)?.label
        ? (enriched.roots_json as any).label
        : null;

    const avatarUrl = getSafeAvatarUrl(enriched.photo_url);

    return (
      <main className="min-h-[100vh] bg-neutral-950 text-white">
        <section className="mx-auto max-w-5xl px-4 py-8">
          <header className="mb-6 flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-full ring-1 ring-white/15">
              {avatarUrl ? (
                // Use plain <img> to avoid next/image domain & optimization failures that can white-screen the RSC
                <img
                  src={avatarUrl}
                  alt={enriched.name ?? 'Member'}
                  width={56}
                  height={56}
                  className="h-14 w-14 object-cover"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-white/5 text-xl">🪶</div>
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold">Welcome, {enriched.email ?? enriched.name ?? 'Member'}</h1>
              <p className="text-sm text-white/60">This is your movement console.</p>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5 md:col-span-2">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {enriched.name && <Pill>👤 {enriched.name}{enriched.surname ? ` ${enriched.surname}` : ''}</Pill>}
                {rootLabel && <Pill>📍 {rootLabel}</Pill>}
                {enriched.vision && <Pill>🌱 {enriched.vision}</Pill>}
                {enriched.person_id && <Pill>🧬 person_id: {enriched.person_id}</Pill>}
              </div>

              <div className="mt-3">
                <h2 className="text-sm font-semibold text-white/80">Your Focus & Gifts</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {enriched.occupation.map((x: string, i: number) => <Pill key={`o${i}`}>🏛️ {x}</Pill>)}
                  {enriched.skill.map((x: string, i: number) => <Pill key={`s${i}`}>🛠️ {x}</Pill>)}
                  {enriched.passion.map((x: string, i: number) => <Pill key={`p${i}`}>✨ {x}</Pill>)}
                  {enriched.compassion.map((x: string, i: number) => <Pill key={`c${i}`}>🤝 {x}</Pill>)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <h2 className="text-sm font-semibold text-white/80">Security</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Passkey</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${enriched.passkey_enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {enriched.passkey_enabled ? 'Enabled' : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Registered devices</span>
                  <span className="text-white/80">{enriched.passkey_cred_ids?.length ?? 0}</span>
                </div>
                <div className="pt-3">
                  <a href="/security" className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
                    Open Security
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
            <h2 className="text-sm font-semibold text-white/80">Mirror</h2>
            <p className="mt-2 text-sm text-white/70">
              A short reflection about you will appear here as you write in your journal and complete onboarding.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href="/journal" className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">Open Journal</a>
              <a href="/proposals" className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">View Proposals</a>
              <a href="/polls" className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">Vote in Polls</a>
            </div>
          </div>
        </section>
      </main>
    );
  } catch (err: any) {
    if (isRedirectError(err)) throw err;

    console.error('dashboard:render fatal error', err);
    const msg = typeof err?.message === 'string' ? err.message : 'Unknown error. Check server logs.';
    const hint = /supabase|env|credential|SERVICE_ROLE|SUPABASE_URL/i.test(msg)
      ? '\n\nHint: Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY exist in Vercel (Server), and that getSupabaseServer reads env at call-time only.'
      : '';

    return (
      <main className="min-h-[100vh] bg-neutral-950 text-white">
        <section className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="mb-4 text-xl font-semibold">Dashboard</h1>
          <ErrorCard title="We hit a server issue while loading your console." details={msg + hint} />
          <div className="mt-4">
            <a href="/login?next=/dashboard" className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
              Re-authenticate
            </a>
          </div>
        </section>
      </main>
    );
  }
}
