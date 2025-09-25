// Auth callback: exchange code for a session then redirect to /welcome
'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import Card from '@/components/Card';

export default function AuthCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState('Finishing sign-in…');
  const name = params.get('name') ?? '';
  const role = params.get('role') ?? '';

  useEffect(() => {
    (async () => {
      const code = params.get('code');
      if (!code) { setMsg('Missing code'); return; }
      const { error } = await supabaseBrowser.auth.exchangeCodeForSession(code);
      if (error) { setMsg('Sign-in failed: ' + error.message); return; }
      router.replace(`/welcome?name=${encodeURIComponent(name)}&role=${encodeURIComponent(role)}`);
    })();
  }, []); // eslint-disable-line

  return (
    <Card title="🔑 Sign-in">
      <div style={{opacity:.8}}>{msg}</div>
    </Card>
  );
}
