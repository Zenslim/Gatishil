// Welcome: ensure a People row for the signed-in user (upsert on email), then show account info
'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import Card from '@/components/Card';

export default function Welcome() {
  const [email, setEmail] = useState<string|null>(null);
  const [nameOut, setNameOut] = useState<string|null>(null);
  const [roleOut, setRoleOut] = useState<string|null>(null);
  const [msg, setMsg] = useState<string>('Setting up your account…');
  const params = useSearchParams();
  const nameIn = params.get('name') ?? '';
  const roleIn = params.get('role') ?? '';

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user?.email) { setMsg('No user session'); return; }
      setEmail(user.email);

      // Try to insert the person (ignore if email already exists)
      try {
        const { error } = await supabaseBrowser
          .from('people')
          .insert([{ name: nameIn || user.user_metadata.full_name || user.email, role: roleIn || null, email: user.email }]);
        if (error && !String(error.message).includes('duplicate key')) {
          // If RLS/unique constraints fail, we still proceed to read
          console.warn(error.message);
        }
      } catch {}

      // Read back the row
      const { data } = await supabaseBrowser.from('people').select('*').eq('email', user.email).limit(1).single();
      setNameOut((data as any)?.name ?? nameIn ?? user.email);
      setRoleOut((data as any)?.role ?? roleIn ?? null);
      setMsg('All set!');
    })();
  }, []);

  return (
    <div style={{ display:'grid', gap:16 }}>
      <Card title="🎉 Welcome">
        <div style={{opacity:.8, marginBottom:8}}>{msg}</div>
        <div><b>Email:</b> {email ?? '—'}</div>
        <div><b>Name:</b> {nameOut ?? '—'}</div>
        <div><b>Role:</b> {roleOut ?? '—'}</div>
        <div style={{marginTop:10, opacity:.8}}>Tip: you can now visit <code>/people</code> and you’ll appear there.</div>
      </Card>
    </div>
  );
}
