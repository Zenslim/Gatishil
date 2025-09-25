// People page: client-side fetch + add form
'use client';
import { useEffect, useState } from 'react';
import Card from '@/components/Card';

type Person = {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  created_at?: string | null;
};

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/people', { cache: 'no-store' });
      const body = await res.json();
      const rows: any[] = Array.isArray(body?.data) ? body.data : Array.isArray(body?.people) ? body.people : [];
      setPeople(rows as Person[]);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load people');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), role: role.trim() || null, email: email.trim() || null })
      });
      const body = await res.json();
      if (!res.ok || body?.ok === false) {
        throw new Error(body?.error ?? 'Failed to add');
      }
      setName(''); setRole(''); setEmail('');
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
      <Card title={`🧑‍🤝‍🧑 People (${people.length})`}>
        <div style={{ opacity: 0.8, marginBottom: 10 }}>
          Live from <code>/api/people</code>. Use the form to add a person.
        </div>
        <form onSubmit={onAdd} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr 1fr auto' }}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" required style={{padding:8, borderRadius:8, border:'1px solid #1f2a44', background:'#0b1222', color:'#eef2ff'}} />
          <input value={role} onChange={e=>setRole(e.target.value)} placeholder="Role (optional)" style={{padding:8, borderRadius:8, border:'1px solid #1f2a44', background:'#0b1222', color:'#eef2ff'}} />
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email (optional)" style={{padding:8, borderRadius:8, border:'1px solid #1f2a44', background:'#0b1222', color:'#eef2ff'}} />
          <button type="submit" style={{padding:'8px 12px', borderRadius:10, border:'1px solid #1f2a44', background:'#0ea5e944', color:'#e0f2fe'}}>Add</button>
        </form>
        {loading && <div style={{opacity:.8, marginTop:8}}>Loading…</div>}
        {error && <div style={{color:'#fca5a5', marginTop:8}}>Error: {error}</div>}
      </Card>

      {people.map((p) => (
        <Card key={p.id} title={p.name}>
          <div><b>Role:</b> {p.role ?? '—'}</div>
          <div><b>Email:</b> {p.email ?? '—'}</div>
          {p.created_at ? (
            <div style={{ marginTop: 8, opacity: 0.6, fontSize: 12 }}>
              added {new Date(p.created_at).toLocaleString()}
            </div>
          ) : null}
        </Card>
      ))}

      {!loading && !people.length && !error && (
        <Card title="No people yet">
          <div style={{ opacity: 0.8 }}>
            Add a person using the form above.
          </div>
        </Card>
      )}
    </div>
  );
}
