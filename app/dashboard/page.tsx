// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = getSupabaseServer();

  // 1) Require an active server session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/dashboard');
  }

  // 2) Load profile and optional person link
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
    roots_json: profile?.roots_json ?? null,
    updated_at: profile?.updated_at ?? null,
    surname: profile?.surname ?? null,
    vision: profile?.vision ?? null,
    occupation: profile?.occupation ?? null,
    skill: profile?.skill ?? null,
    passion: profile?.passion ?? null,
    compassion: profile?.compassion ?? null,
    // Fill from user (auth.users) instead of profile row – avoids null
    email: user.email ?? null,
    phone: profile?.phone ?? null,
    // Prefer authoritative link table for person id
    person_id: link?.person_id ?? profile?.person_id ?? null,
    passkey_enabled: profile?.passkey_enabled ?? null,
    passkey_cred_ids: profile?.passkey_cred_ids ?? null,
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Welcome, {user.email}</h1>
      <p className="mt-2 text-sm text-gray-500">This is your movement console.</p>
      <pre className="mt-6 rounded-lg bg-black/5 p-4 overflow-auto text-xs">
        {JSON.stringify(enriched, null, 2)}
      </pre>
    </main>
  );
}
