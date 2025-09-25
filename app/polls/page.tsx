// AUTO-GENERATED CLIENT PAGE
'use client';
import { useEffect, useState } from 'react';
import Card from '@/components/Card';

type Row = Record<string, any>;

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/polls', { cache: 'no-store' });
        const body = await res.json();
        const data = Array.isArray(body?.data) ? body.data : [];
        setRows(data);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
      <Card title={`Polls (${rows.length})`}>
        <div style={{ opacity: 0.8, marginBottom: 10 }}>
          Live from <code>/api/polls</code>. Add rows in Supabase → <code>public.polls</code> and refresh.
        </div>
        {loading && <div style={{opacity:.8}}>Loading…</div>}
        {error && <div style={{color:'#fca5a5'}}>Error: {error}</div>}
      </Card>

      {rows.map((row) => (
        <Card key={String(row.id ?? Math.random())} title={String(row.name ?? row.title ?? row.question ?? '—')}>
        <div><b>Open:</b> {String((row as any).open_at ?? '—')}</div>
        <div><b>Close:</b> {String((row as any).close_at ?? '—')}</div>
          {row.created_at ? <div style={{ marginTop: 8, opacity: .6, fontSize: 12 }}>added {new Date(row.created_at).toLocaleString()}</div> : null}
        </Card>
      ))}

      {!loading && !rows.length && !error && (
        <Card title="No rows yet">
          <div style={{ opacity: 0.8 }}>
            Insert rows in Supabase → <code>public.polls</code> and refresh.
          </div>
        </Card>
      )}
    </div>
  );
}
