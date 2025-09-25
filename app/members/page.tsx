// app/members/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, User } from '@supabase/supabase-js';

type PublicCard = {
  id: string;
  name: string;
  thar: string;
  photo: string;
  region: string;
};

export default function MembersPage() {
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cards, setCards] = useState<PublicCard[]>([]);
  const [msg, setMsg] = useState<string>('');

  // simple form state (what you want to show in your public card)
  const [fullName, setFullName] = useState('');
  const [thar, setThar] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState('');
  const [region, setRegion] = useState('');
  const [skillsCsv, setSkillsCsv] = useState(''); // "farmer, designer"

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }, [supabaseUrl, supabaseAnonKey]);

  // 1) find current signed-in user (needed for RPC)
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSessionUser(data.session?.user ?? null);

      // Prefill from existing public card (if any)
      if (data.session?.user) {
        const { data: myPublic } = await supabase
          .from('members_public') // ✅ new public Members directory view
          .select('*')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (myPublic) {
          setFullName((myPublic as any).name || '');
          setThar((myPublic as any).thar || '');
          setPhoto((myPublic as any).photo || '');
          setRegion((myPublic as any).region || '');
        }
      }
    };

    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSessionUser(s?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, [supabase]);

  // 2) load public list (anyone can see)
  const loadPublicList = async () => {
    if (!supabase) return;
    setLoadingList(true);
    const { data, error } = await supabase
      .from('members_public') // ✅ read from members_public
      .select('*')
      .order('name', { ascending: true });
    if (!error && data) setCards(data as PublicCard[]);
    setLoadingList(false);
  };

  useEffect(() => {
    if (!supabase) return;
    loadPublicList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // 3) submit to RPC upsert_my_profile (authenticated only)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setMsg('');
    if (!sessionUser) {
      setMsg('Please sign in first, then try again.');
      return;
    }

    setSubmitting(true);
    const skills =
      skillsCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) || [];

    const { error } = await supabase.rpc('upsert_my_profile', {
      p_full_name: emptyToNull(fullName),
      p_thar: emptyToNull(thar),
      p_phone: emptyToNull(phone),
      p_photo: emptyToNull(photo),
      p_region: emptyToNull(region),
      p_skills: skills.length ? skills : null,
      p_bio: null,
    });

    if (error) {
      setMsg(`Save failed: ${error.message}`);
    } else {
      setMsg('Saved ✅ — your member card is updated.');
      await loadPublicList();
    }
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            🌿 Members — Public Directory
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            ELI15: When you’re signed in, the form below calls a small Supabase function
            <code className="mx-1 bg-slate-800 px-1 rounded">upsert_my_profile</code>
            that writes only <em>your</em> row. The list reads the public view
            <code className="mx-1 bg-slate-800 px-1 rounded">members_public</code>
            (our “Members” directory) that everyone can see.
          </p>
        </header>

        {/* Self card editor */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 mb-8">
          <h2 className="font-semibold mb-3">Your Member Card</h2>
          {!sessionUser ? (
            <div className="text-sm text-amber-300">
              You’re not signed in. Sign in first, then return to update your card.
            </div>
          ) : (
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full name" value={fullName} onChange={setFullName} />
              <Field label="Thar (surname)" value={thar} onChange={setThar} />
              <Field label="Phone (unique)" value={phone} onChange={setPhone} />
              <Field label="Photo URL" value={photo} onChange={setPhoto} />
              <Field label="Region" value={region} onChange={setRegion} />
              <Field
                label="Skills (comma separated)"
                value={skillsCsv}
                onChange={setSkillsCsv}
                placeholder="farmer, designer"
              />

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Save my member card'}
                </button>
                {msg && <span className="ml-3 text-sm text-slate-300">{msg}</span>}
              </div>
            </form>
          )}
        </section>

        {/* Public list */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="font-semibold mb-3">Public Members</h2>
          {loadingList ? (
            <div className="text-sm text-slate-300">Loading…</div>
          ) : cards.length === 0 ? (
            <div className="text-sm text-slate-300">
              No members yet. Once people save their card above, they appear here.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
                      {c.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.photo}
                          alt={c.name || 'photo'}
                          className="h-12 w-12 object-cover"
                        />
                      ) : (
                        <span className="text-lg">🧿</span>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{c.name || '—'}</div>
                      <div className="text-xs text-slate-400">
                        {c.thar || '—'} {c.region ? `· ${c.region}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs text-slate-300 mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-slate-800/70 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600"
      />
    </label>
  );
}

function emptyToNull(s: string | null | undefined) {
  if (!s) return null;
  const t = String(s).trim();
  return t.length ? t : null;
}
