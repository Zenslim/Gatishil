'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient, Session } from '@supabase/supabase-js';

type Profile = {
  user_id: string;
  name: string | null;
  surname: string | null;
  photo_url: string | null;
  vision: string | null;
  occupation: string[] | null;
  skill: string[] | null;
  passion: string[] | null;
  compassion: string[] | null;
  roots_json: any | null;
  person_id?: string | null;
  passkey_enabled?: boolean | null;
  passkey_cred_ids?: string[] | null;
};

export default function DashboardPage() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    return createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }, []);

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // === 1) Ensure browser SDK has a session by syncing from server if needed ===
  useEffect(() => {
    let alive = true;

    async function ensureBrowserSession() {
      try {
        // Does the browser already have a session?
        const local = await supabase.auth.getSession();
        const hasLocal = Boolean(local?.data?.session);

        // Ask server (cookie is source of truth)
        const serverRes = await fetch('/api/auth/session', { cache: 'no-store' });
        const serverJson = serverRes.ok ? await serverRes.json() : { authenticated: false };
        const hasServer = Boolean(serverJson?.authenticated);

        // If server says "yes" but browser says "no" => fetch tokens & setSession
        if (hasServer && !hasLocal) {
          const syncRes = await fetch('/api/auth/sync', { method: 'POST', cache: 'no-store' });
          if (syncRes.ok) {
            const j = await syncRes.json();

            // Be liberal in what we accept
            const access_token =
              j?.access_token ?? j?.data?.session?.access_token ?? j?.session?.access_token ?? null;
            const refresh_token =
              j?.refresh_token ?? j?.data?.session?.refresh_token ?? j?.session?.refresh_token ?? null;

            if (access_token && refresh_token) {
              const { data: setData, error: setErr } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (setErr) throw setErr;
              if (setData?.user?.email) setEmail(setData.user.email);
            }
          }
        }

        // After sync, re-read the session from browser
        const again = await supabase.auth.getSession();
        const session = again?.data?.session as Session | null;

        if (!alive) return;
        if (!session) {
          // No session anywhere -> go login (no loop now, because login won’t bounce back)
          window.location.assign('/login?next=/dashboard');
          return;
        }

        setEmail(session.user.email ?? null);
        setChecking(false);
      } catch (e: any) {
        if (!alive) return;
        // On any unexpected error, fall back to login.
        window.location.assign('/login?next=/dashboard');
      }
    }

    ensureBrowserSession();
    return () => { alive = false; };
  }, [supabase]);

  // === 2) Load profile (with timeout) once session is present ===
  useEffect(() => {
    if (checking) return;
    let alive = true;
    let t: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        t = setTimeout(() => {
          if (alive) {
            setLoading(false);
            setErr('Network timeout loading your console. Please reload or try again.');
          }
        }, 8000);

        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;
        if (!alive) return;
        if (!user) {
          window.location.assign('/login?next=/dashboard');
          return;
        }

        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!alive) return;
        if (pErr) {
          setErr('We could not load your profile.');
          setLoading(false);
          return;
        }

        // Try getting person link; ignore errors
        let person_id: string | null = null;
        try {
          const { data: link } = await supabase
            .from('user_person_links')
            .select('person_id')
            .eq('user_id', user.id)
            .maybeSingle();
          person_id = (link as any)?.person_id ?? (prof as any)?.person_id ?? null;
        } catch {}

        const enriched: Profile = {
          user_id: user.id,
          name: prof?.name ?? null,
          surname: prof?.surname ?? null,
          photo_url: safeAvatar(prof?.photo_url ?? null),
          vision: prof?.vision ?? null,
          occupation: Array.isArray(prof?.occupation) ? prof?.occupation : [],
          skill: Array.isArray(prof?.skill) ? prof?.skill : [],
          passion: Array.isArray(prof?.passion) ? prof?.passion : [],
          compassion: Array.isArray(prof?.compassion) ? prof?.compassion : [],
          roots_json: prof?.roots_json ?? null,
          person_id,
          passkey_enabled: Boolean(prof?.passkey_enabled),
          passkey_cred_ids: Array.isArray(prof?.passkey_cred_ids) ? prof?.passkey_cred_ids : [],
        };

        setProfile(enriched);
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setErr(typeof e?.message === 'string' ? e.message : 'Unknown error loading your console.');
        setLoading(false);
      } finally {
        if (t) clearTimeout(t);
      }
    })();

    return () => {
      alive = false;
      if (t) clearTimeout(t);
    };
  }, [checking, supabase]);

  return (
    <main className="min-h-[100vh] bg-neutral-950 text-white">
      <section className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex items-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-full ring-1 ring-white/15">
            {profile?.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.name ?? 'Member'}
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
            <h1 className="text-xl font-semibold">
              {checking ? 'Checking session…' : `Welcome, ${email ?? profile?.name ?? 'Member'}`}
            </h1>
            <p className="text-sm text-white/60">This is your movement console.</p>
          </div>
        </header>

        {loading && !err && <Skeleton />}

        {err && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            <div className="font-semibold">We hit a problem while loading your console.</div>
            <pre className="mt-2 whitespace-pre-wrap text-red-300/90">{err}</pre>
            <div className="mt-3 flex gap-2">
              <button className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10" onClick={() => window.location.reload()}>
                Reload
              </button>
              <a href="/login?next=/dashboard" className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
                Re-authenticate
              </a>
            </div>
          </div>
        )}

        {!loading && !err && profile && (
          <Console profile={profile} />
        )}
      </section>
    </main>
  );
}

/* ——— UI helpers ——— */

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-1/3 rounded bg_white_10" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-40 rounded bg_white_10 md:col-span-2" />
        <div className="h-40 rounded bg_white_10" />
      </div>
      <div className="h-40 rounded bg_white_10" />
    </div>
  );
}
// Tailwind avoids underscore classes; use inline style fallback for the skeleton shades:
const bg_white_10 = 'background-color: rgba(255,255,255,0.06)';

function Console({ profile }: { profile: Profile }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5 md:col-span-2">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {profile.name && <Pill>👤 {profile.name}{profile.surname ? ` ${profile.surname}` : ''}</Pill>}
          {labelFromRoots(profile.roots_json) && <Pill>📍 {labelFromRoots(profile.roots_json)}</Pill>}
          {profile.vision && <Pill>🌱 {profile.vision}</Pill>}
          {profile.person_id && <Pill>🧬 person_id: {profile.person_id}</Pill>}
        </div>
        <div className="mt-3">
          <h2 className="text-sm font-semibold text-white/80">Your Focus & Gifts</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {(profile.occupation || []).map((x, i) => <Pill key={`o${i}`}>🏛️ {x}</Pill>)}
            {(profile.skill || []).map((x, i) => <Pill key={`s${i}`}>🛠️ {x}</Pill>)}
            {(profile.passion || []).map((x, i) => <Pill key={`p${i}`}>✨ {x}</Pill>)}
            {(profile.compassion || []).map((x, i) => <Pill key={`c${i}`}>🤝 {x}</Pill>)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <h2 className="text-sm font-semibold text-white/80">Security</h2>
        <div className="mt-3 space-y-2 text-sm">
          <Row label="Passkey"><Badge ok={!!profile.passkey_enabled} /></Row>
          <Row label="Registered devices"><span className="text-white/80">{profile.passkey_cred_ids?.length ?? 0}</span></Row>
          <div className="pt-3">
            <a href="/security" className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
              Open Security
            </a>
          </div>
        </div>
      </div>

      <div className="md:col-span-3 rounded-2xl border border-white/10 bg-black/30 p-5">
        <h2 className="text-sm font-semibold text-white/80">Mirror</h2>
        <p className="mt-2 text-sm text-white/70">A short reflection about you will appear here as you write in your journal and complete onboarding.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="/journal" className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">Open Journal</a>
          <a href="/proposals" className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">View Proposals</a>
          <a href="/polls" className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">Vote in Polls</a>
        </div>
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/70">{label}</span>
      {children}
    </div>
  );
}

function Badge({ ok }: { ok: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
      {ok ? 'Enabled' : 'Not set'}
    </span>
  );
}

const ALLOWED_SUFFIX = ['supabase.co', 'googleusercontent.com'];
const ALLOWED_HOSTS = new Set(['avatars.githubusercontent.com','raw.githubusercontent.com','user-images.githubusercontent.com']);

function safeAvatar(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return null;
    const h = u.hostname.toLowerCase();
    if (ALLOWED_HOSTS.has(h)) return u.toString();
    if (ALLOWED_SUFFIX.some((s) => h === s || h.endsWith(`.${s}`))) return u.toString();
    return null;
  } catch { return null; }
}

function labelFromRoots(roots: any): string | null {
  if (roots && typeof roots === 'object' && roots.label) return String(roots.label);
  return null;
}
