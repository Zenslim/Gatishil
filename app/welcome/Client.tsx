"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Card from '@/components/Card';

export default function Client() {
  const [email, setEmail] = useState<string | null>(null);
  const [nameOut, setNameOut] = useState<string | null>(null);
  const [roleOut, setRoleOut] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>('Setting up your account…');

  const params = useSearchParams();
  const nameIn = params.get('name') ?? '';
  const roleIn = params.get('role') ?? '';

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setMsg('No user session');
        return;
      }

      setEmail(user.email);

      // Attempt initial upsert (insert-once; ignore duplicate)
      try {
        const fullName = (user.user_metadata as any)?.full_name || user.email;
        const { error } = await supabase
          .from('people')
          .insert([
            {
              name: nameIn || fullName,
              role: roleIn || null,
              email: user.email,
            },
          ]);

        // Ignore duplicates; warn on other errors
        if (error && !String(error.message).toLowerCase().includes('duplicate')) {
          console.warn('[people.insert]', error.message);
        }
      } catch {
        // no-op
      }

      // Read back the record to populate outputs
      const { data } = await supabase
        .from('people')
        .select('*')
        .eq('email', user.email)
        .limit(1)
        .single();

      const fallbackName = (user.user_metadata as any)?.full_name || user.email;

      // Order: DB name → URL name → full_name → email
      setNameOut(((data as any)?.name ?? nameIn ?? fallbackName) ?? user.email);

      // Order: DB role → URL role → null
      setRoleOut((data as any)?.role ?? roleIn ?? null);

      setMsg('All set!');
    })();
  }, [nameIn, roleIn]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="🎉 Welcome">
        <div style={{ opacity: 0.8, marginBottom: 8 }}>{msg}</div>
        <div><b>Email:</b> {email ?? '—'}</div>
        <div><b>Name:</b> {nameOut ?? '—'}</div>
        <div><b>Role:</b> {roleOut ?? '—'}</div>
        <div style={{ marginTop: 10, opacity: 0.8 }}>
          Tip: you can now visit <code>/people</code> and you’ll appear there.
        </div>
      </Card>
    </div>
  );
}
