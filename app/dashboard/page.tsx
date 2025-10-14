import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

type Db = any;

function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient<Db>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );
}

async function getCounts(supabase: ReturnType<typeof supabaseServer>) {
  async function count(table: string): Promise<number> {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  }
  const [polls, proposals, decisions] = await Promise.all([
    count('polls'),
    count('proposals'),
    count('decisions'),
  ]);
  return { polls, proposals, decisions };
}

async function getPasskeyStatus(supabase: ReturnType<typeof supabaseServer>, userId: string) {
  try {
    const { data: sec } = await supabase
      .from('user_security')
      .select('passkey_enabled, passkey_cred_ids')
      .eq('user_id', userId)
      .maybeSingle();
    const { data: creds } = await supabase
      .from('webauthn_credentials')
      .select('credential_id, device_type, backed_up, last_used_at')
      .eq('user_id', userId)
      .order('last_used_at', { ascending: false })
      .limit(3);
    return {
      enabled: !!sec?.passkey_enabled,
      credIds: Array.isArray(sec?.passkey_cred_ids) ? sec?.passkey_cred_ids : [],
      devices: creds ?? [],
    };
  } catch {
    return { enabled: false, credIds: [], devices: [] };
  }
}

function Avatar({ url, name }: { url?: string | null; name: string }) {
  return (
    <div className="h-12 w-12 rounded-2xl bg-white/10 ring-1 ring-white/10 overflow-hidden grid place-items-center">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-lg">{name?.[0]?.toUpperCase() || '🙂'}</span>
      )}
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number | string; href: string }) {
  return (
    <a href={href} className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-5 block">
      <div className="text-3xl font-semibold">{value}</div>
      <div className="text-sm text-white/70 mt-1">{label}</div>
      <div className="mt-3 text-xs text-emerald-300 opacity-0 group-hover:opacity-100 transition">Open →</div>
    </a>
  );
}

function DeviceRow({ d }: { d: any }) {
  const label = d?.device_type || 'Unknown device';
  const last = d?.last_used_at ? new Date(d.last_used_at).toLocaleString() : '—';
  const tail = d?.credential_id ? `…${String(d.credential_id).slice(-6)}` : '';
  return (
    <div className="flex items-center justify-between py-2">
      <div className="text-sm">
        <div className="font-medium">{label} <span className="text-white/40">{tail}</span></div>
        <div className="text-white/50 text-xs">Last used: {last}</div>
      </div>
      <div className="text-xs px-2 py-1 rounded-lg border border-white/10 bg-white/5">
        {d?.backed_up ? 'Backed up' : 'Local only'}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard');
  }

  const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Friend';
  const avatar = user.user_metadata?.avatar_url || null;

  const [{ polls, proposals, decisions }, passkey] = await Promise.all([
    getCounts(supabase),
    getPasskeyStatus(supabase, user.id),
  ]);

  return (
    <main className="min-h-[100svh] bg-neutral-950 text-white">
      <section className="px-6 py-10 md:py-14 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <Avatar url={avatar} name={name} />
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Welcome back, {name}</h1>
            <p className="text-white/70 mt-1">This is your movement console — vote, propose, and track our decisions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <Stat label="Open Polls" value={polls} href="/polls" />
          <Stat label="Proposals" value={proposals} href="/proposals" />
          <Stat label="Decisions" value={decisions} href="/decisions" />
        </div>
      </section>

      <section className="px-6 pb-16 max-w-6xl mx-auto">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-emerald-900/20 to-black/20 p-6 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-2xl font-semibold">Security</div>
              <p className="text-white/70 mt-1">Passkeys make your visits effortless and safe.</p>
              <p className="text-white/60 text-sm mt-2">
                Passkeys use your device’s built-in authenticator (Face ID, Touch ID, Android Biometric Prompt, or Windows Hello on laptops and desktops).
              </p>
              <p className="text-white/60 text-sm mt-1">
                If biometric isn’t available, your 4-digit PIN is the universal fallback.
              </p>
            </div>
            <a href="/onboard?src=dashboard&step=trust" className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 transition">
              {/* @ts-ignore */}
              {passkey.enabled ? 'Add another device' : 'Create a passkey'}
            </a>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 p-5 bg-black/30">
              <div className="text-sm text-white/60">Status</div>
              <div className="mt-2 text-lg">
                {/* @ts-ignore */}
                {passkey.enabled ? '🟢 Passkey enabled' : '⚪ Passkey not set'}
              </div>
              <div className="mt-4 text-sm text-white/60">Linked devices</div>
              <div className="mt-2 divide-y divide-white/10">
                {/* @ts-ignore */}
                {passkey.devices.length ? (
                  // @ts-ignore
                  passkey.devices.map((d: any) => <DeviceRow key={d.credential_id} d={d} />)
                ) : (
                  <div className="text-white/50 text-sm py-2">No devices linked yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 p-5 bg-black/30">
              <div className="text-sm text-white/60">Quick actions</div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a href="/polls" className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-4">🗳️ Vote on polls</a>
                <a href="/proposals" className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-4">📜 Review proposals</a>
                <a href="/onboard?src=dashboard&step=trust" className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-4">🔐 Manage passkeys</a>
                <a href="/account" className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-4">⚙️ Account settings</a>
              </div>
              <p className="text-xs text-white/50 mt-4">
                Tip: If a device is lost, revoke its credential from Security.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-6 pb-10 max-w-6xl mx-auto text-white/40 text-xs">
        Gatishil Nepal • Built for collective action
      </footer>
    </main>
  );
}
