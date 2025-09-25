// Join page: ask for name/role/email and send a magic link
'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import Card from '@/components/Card';

export default function JoinPage() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?name=${encodeURIComponent(name)}&role=${encodeURIComponent(role)}`;
      const { error } = await supabaseBrowser.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true }
      });
      if (error) throw error;
      setMsg('Check your email for a sign-in link. Open it to finish joining.');
    } catch (e:any) {
      setErr(e.message || 'Failed to send link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display:'grid', gap:16 }}>
      <Card title="👋 Join">
        <div style={{opacity:.8, marginBottom:10}}>We use passwordless sign-in. Enter your details and we’ll email you a secure link.</div>
        <form onSubmit={onSubmit} style={{ display:'grid', gap:8, gridTemplateColumns:'1fr 1fr 1fr auto' }}>
          <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={{padding:8, borderRadius:8, border:'1px solid #1f2a44', background:'#0b1222', color:'#eef2ff'}} />
          <input value={role} onChange={e=>setRole(e.target.value)} placeholder="Role (optional)" style={{padding:8, borderRadius:8, border:'1px solid #1f2a44', background:'#0b1222', color:'#eef2ff'}} />
          <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" style={{padding:8, borderRadius:8, border:'1px solid #1f2a44', background:'#0b1222', color:'#eef2ff'}} />
          <button disabled={loading} type="submit" style={{padding:'8px 12px', borderRadius:10, border:'1px solid #1f2a44', background:'#0ea5e944', color:'#e0f2fe'}}>{loading ? 'Sending…' : 'Send link'}</button>
        </form>
        {msg && <div style={{marginTop:8, color:'#a7f3d0'}}>{msg}</div>}
        {err && <div style={{marginTop:8, color:'#fca5a5'}}>Error: {err}</div>}
      </Card>
    </div>
  );
}
