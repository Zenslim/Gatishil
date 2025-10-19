import { redirect } from 'next/navigation';
import Image from 'next/image';
import { getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: link } = await supabase
    .from('user_person_links')
    .select('person_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const enriched = {
    idx: profile?.idx ?? null,
    user_id: user.id,
    name: profile?.name ?? null,
    photo_url: profile?.photo_url ?? null,
    roots_json: profile?.roots_json ?? null as any,
    updated_at: profile?.updated_at ?? null,
    surname: profile?.surname ?? null,
    vision: profile?.vision ?? null,
    occupation: profile?.occupation ?? [],
    skill: profile?.skill ?? [],
    passion: profile?.passion ?? [],
    compassion: profile?.compassion ?? [],
    email: user.email ?? null,
    phone: profile?.phone ?? null,
    person_id: link?.person_id ?? profile?.person_id ?? null,
  };

  const rootLabel =
    typeof enriched.roots_json === 'object' && enriched.roots_json?.label
      ? enriched.roots_json.label
      : null;

  const Pill = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );

  return (
    <main className="min-h-[100vh] bg-neutral-950 text-white">
      <section className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex items-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-full ring-1 ring-white/15">
            {enriched.photo_url ? (
              <Image
                src={enriched.photo_url}
                alt={enriched.name ?? 'Member'}
                fill
                sizes="56px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-white/5 text-xl">🪶</div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold">
              Welcome, {enriched.email ?? enriched.name ?? 'Member'}
            </h1>
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
                {enriched.occupation?.map((x: string, i: number) => <Pill key={`o${i}`}>🏛️ {x}</Pill>)}
                {enriched.skill?.map((x: string, i: number) => <Pill key={`s${i}`}>🛠️ {x}</Pill>)}
                {enriched.passion?.map((x: string, i: number) => <Pill key={`p${i}`}>✨ {x}</Pill>)}
                {enriched.compassion?.map((x: string, i: number) => <Pill key={`c${i}`}>🤝 {x}</Pill>)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <h2 className="text-sm font-semibold text-white/80">Security</h2>
            <p className="mt-3 text-sm text-white/70">
              Your device PIN keeps this console trusted. Update it or review devices anytime from the security screen.
            </p>
            <div className="pt-4">
              <a
                href="/security"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                Open Security
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
          <h2 className="text-sm font-semibold text-white/80">Mirror</h2>
          <p className="mt-2 text-sm text-white/70">
            A short reflection about you will appear here as you write in your journal and complete onboarding.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="/journal"
              className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Open Journal
            </a>
            <a
              href="/proposals"
              className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              View Proposals
            </a>
            <a
              href="/polls"
              className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Vote in Polls
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
