// app/members/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

import React, { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

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

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  // 1) find current signed-in user (needed for RPC)
  useEffect(() => {
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
    setLoadingList(true);
    const { data, error } = await supabase
      .from('members_public') // ✅ read from members_public
      .select('*')
      .order('name', { ascending: true });
    if (!error && data) setCards(data as PublicCard[]);
    setLoadingList(false);
  };

  useEffect(() => {
    // Defer any supabase/auth usage to the browser after mount
    try {
      const sb = getSupabaseBrowserClient();
      // optional: warm-up call or auth check could go here
    } catch {
      // ignore; on server it won't run
    } finally {
      setReady(true);
    }
  }, []);

  return (
    <main className="min-h-[60vh] px-6 py-10">
      <h1 className="text-2xl font-semibold mb-2">Members</h1>
      {!ready ? (
        <p className="opacity-70">Loading…</p>
      ) : (
        <p className="opacity-80">Members console will appear here.</p>
      )}
    </main>
  );
}
