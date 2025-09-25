'use client';
import { useEffect, useState } from 'react';
import Card from '@/components/Card';

type Person = {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  created_at?: string | null;
};

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
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
    run();
  }, []);

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
      <Card title={`🧑‍🤝‍🧑 People (${people.length})`}>
        <div style={{ opacity: 0.8, marginBottom: 10 }}>
          Live from <code>/api/people</code> (client fetch). Refresh after inserting rows in Supabase → <code>public.people</code>.
        </div>
        {loading && <div style={{opacity:0.8}}>Loading…</div>}
        {error && <div style={{color:'#fca5a5'}}>Error: {error}</div>}
      </Card>

      {people.map((p) => (
        <Card key={p.id} title={p.name}>
          <div><b>Role:</b> {p.role ?? '—'}</div>
          <div><b>Status:</b> {p.status ?? '—'}</div>
          <div><b>Email:</b> {p.email ?? '—'}</div>
          <div><b>Phone:</b> {p.phone ?? '—'}</div>
          {p.tags?.length ? (
            <div style={{ marginTop: 6 }}>
              <b>Tags:</b>{' '}
              {p.tags.map((t, i) => (
                <span key={t + i} style={{ border: '1px solid #1f2a44', padding: '2px 8px', borderRadius: 999, marginRight: 6 }}>
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          {p.notes ? (
            <div style={{ marginTop: 8, opacity: 0.85 }}>
              <b>Notes:</b> {p.notes}
            </div>
          ) : null}
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
            Add rows in Supabase → <code>public.people</code> and refresh. (You can insert a few sample rows.)
          </div>
        </Card>
      )}
    </div>
  );
}
