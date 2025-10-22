// Client side logic for /welcome
'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import Card from '@/components/Card';

export default function Client() {
  const [identifier, setIdentifier] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [nameOut, setNameOut] = useState<string | null>(null);
  const [roleOut, setRoleOut] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>('Setting up your account…');
  const params = useSearchParams();
  const nameIn = params.get('name') ?? '';
  const roleIn = params.get('role') ?? '';

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabaseBrowser.auth.getUser();
      const user = authData?.user ?? null;
      if (!user) { setMsg('No user session'); return; }

      let profilePhone: string | null = null;
      let profileEmail: string | null = null;
      try {
        const { data: profile } = await supabaseBrowser
          .from('profiles')
          .select('phone,email')
          .eq('user_id', user.id)
          .maybeSingle();
        profilePhone = typeof profile?.phone === 'string' ? profile.phone : null;
        profileEmail = typeof profile?.email === 'string' ? profile.email : null;
      } catch (profileErr) {
        console.warn('welcome:profile lookup failed', profileErr);
      }

      const idLabel = user.phone ?? profilePhone ?? user.email ?? profileEmail ?? '';
      setIdentifier(idLabel || null);
      const primaryEmail = user.email ?? profileEmail ?? null;
      setEmail(primaryEmail);

      if (primaryEmail) {
        try {
          const { error } = await supabaseBrowser
            .from('people')
            .insert([{ name: nameIn || user.user_metadata?.full_name || primaryEmail, role: roleIn || null, email: primaryEmail }]);
          if (error && !String(error.message).toLowerCase().includes('duplicate')) {
            console.warn(error.message);
          }
        } catch {}

        const { data } = await supabaseBrowser.from('people').select('*').eq('email', primaryEmail).limit(1).single();
        setNameOut((data as any)?.name ?? nameIn ?? idLabel || primaryEmail);
        setRoleOut((data as any)?.role ?? roleIn ?? null);
      } else {
        setNameOut(nameIn || idLabel || null);
        setRoleOut(roleIn || null);
      }
      setMsg('All set!');
    })();
  }, []);

  return (
    <div style={{ display:'grid', gap:16 }}>
      <Card title="🎉 Welcome">
        <div style={{opacity:.8, marginBottom:8}}>{msg}</div>
        <div><b>Identifier:</b> {identifier ?? '—'}</div>
        <div><b>Email:</b> {email ?? '—'}</div>
        <div><b>Name:</b> {nameOut ?? '—'}</div>
        <div><b>Role:</b> {roleOut ?? '—'}</div>
        <div style={{marginTop:10, opacity:.8}}>Tip: you can now visit <code>/people</code> and you’ll appear there.</div>
      </Card>
    </div>
  );
}
