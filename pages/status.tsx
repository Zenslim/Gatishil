// pages/status.tsx
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Probe = { label: string; ok: boolean; detail?: string; ms?: number };

export default function StatusPage() {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [startedAt] = useState<number>(() => Date.now());

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // lightweight client (no external file needed)
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    const run = async () => {
      const results: Probe[] = [];

      // 1) Env presence
      results.push({
        label: 'NEXT_PUBLIC_SUPABASE_URL present',
        ok: Boolean(supabaseUrl),
        detail: supabaseUrl ? maskUrl(supabaseUrl) : 'missing',
      });
      results.push({
        label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY present',
        ok: Boolean(supabaseAnonKey),
        detail: supabaseAnonKey ? maskKey(supabaseAnonKey) : 'missing',
      });

      // 2) Supabase Auth ping
      if (supabase) {
        const t0 = performance.now();
        try {
          const { error } = await supabase.auth.getSession();
          const t1 = performance.now();
          results.push({
            label: 'Supabase Auth reachable',
            ok: !error,
            detail: error ? error.message : 'ok',
            ms: Math.round(t1 - t0),
          });
        } catch (e: any) {
          const t1 = performance.now();
          results.push({
            label: 'Supabase Auth reachable',
            ok: false,
            detail: e?.message || 'unknown error',
            ms: Math.round(t1 - t0),
          });
        }
      } else {
        results.push({
          label: 'Supabase Auth reachable',
          ok: false,
          detail: 'client not initialized (missing env)',
        });
      }

      // 3) Safe DB probe (profiles → users)
      if (supabase) {
        const t0 = performance.now();
        let ok = false;
        let detail = '';
        try {
          let { data, error, status } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);

          if (error) {
            const notFound =
              // Postgres “relation does not exist”
              (error as any)?.code === '42P01' ||
              /relation .* does not exist/i.test(error.message);

            if (notFound) {
              const retry = await supabase.from('users').select('id').limit(1);
              if (retry.error) {
                ok = false;
                detail = `profiles & users not found / blocked: ${retry.error.message}`;
              } else {
                ok = true;
                detail = `users ok (${retry.data?.length || 0} rows visible)`;
              }
            } else {
              ok = false;
              detail = `profiles error: ${error.message} (status ${status})`;
            }
          } else {
            ok = true;
            detail = `profiles ok (${data?.length || 0} rows visible)`;
          }
        } catch (e: any) {
          ok = false;
          detail = e?.message || 'unknown db error';
        }
        const t1 = performance.now();
        results.push({
          label: 'Database probe (profiles → users)',
          ok,
          detail,
          ms: Math.round(t1 - t0),
        });
      }

      setProbes(results);
    };

    run();
  }, [supabase, supabaseUrl, supabaseAnonKey]);

  const allGood = probes.length > 0 && probes.every((p) => p.ok);

  return (
    <main style={wrap}>
      <div style={card}>
        <h1 style={h1}>🌿 Gatishil — System Status</h1>
        <p style={muted}>Pages Router route to avoid 404. Checks envs, Supabase Auth, and a light DB probe.</p>

        <section style={section}>
          <h2 style={h2}>Build & Env</h2>
          <ul style={ul}>
            <li><span style={label}>Build started: </span>{new Date(startedAt).toLocaleString()}</li>
            <li><span style={label}>Runtime: </span>Next.js Pages Router (client)</li>
            <li><span style={label}>Repo: </span>GitHub → Vercel (auto-deploy)</li>
          </ul>
        </section>

        <section style={section}>
          <h2 style={h2}>Probes</h2>
          <div style={grid}>
            {probes.map((p, idx) => (
              <div key={idx} style={{...probeBox, borderColor: p.ok ? '#059669' : '#be123c', background: p.ok ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)'}}>
                <div style={row}>
                  <div style={probeTitle}>{p.label}</div>
                  <div style={{...pill, background: p.ok ? '#059669' : '#be123c'}}>{p.ok ? 'OK' : 'FAIL'}</div>
                </div>
                {p.detail && <div style={detail}>{p.detail}</div>}
                {typeof p.ms === 'number' && <div style={tiny}>{p.ms} ms</div>}
              </div>
            ))}
          </div>

          <div style={{marginTop: 12, fontSize: 14}}>
            <span style={{marginRight: 8}}>Overall:</span>
            <span style={{...pill, background: allGood ? '#059669' : '#b45309'}}>{allGood ? 'Healthy' : 'Needs review'}</span>
          </div>

          <ol style={notes}>
            <li>If envs are missing, add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel → Project → Settings → Environment Variables.</li>
            <li>If DB probe says “relation does not exist”, your table is not created or named differently. App is fine—fix tables/RLS later.</li>
            <li>If Auth fails, confirm anon key + project URL in Supabase settings.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}

/** helpers */
function maskUrl(url: string) {
  try {
    const u = new URL(url);
    const host = u.host;
    if (host.length <= 8) return host;
    return `${host.slice(0, 4)}…${host.slice(-4)}`;
  } catch {
    return 'invalid URL';
  }
}

function maskKey(k: string) {
  if (k.length <= 10) return '•••';
  return `${k.slice(0, 5)}…${k.slice(-5)}`;
}

/** minimal inline styles to avoid Tailwind dependency */
const wrap: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(to bottom, #0f172a, #000)',
  color: '#e5e7eb',
  padding: 24,
};
const card: React.CSSProperties = { maxWidth: 960, margin: '0 auto' };
const h1: React.CSSProperties = { fontSize: 28, fontWeight: 800, marginBottom: 6 };
const h2: React.CSSProperties = { fontSize: 16, fontWeight: 700, marginBottom: 8 };
const muted: React.CSSProperties = { fontSize: 13, color: '#94a3b8', marginBottom: 16 };
const section: React.CSSProperties = { border: '1px solid #1f2937', background: 'rgba(15,23,42,0.5)', borderRadius: 16, padding: 16, marginBottom: 16 };
const ul: React.CSSProperties = { fontSize: 14, listStyle: 'none', paddingLeft: 0, margin: 0, lineHeight: 1.7 };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 };
const probeBox: React.CSSProperties = { border: '1px solid', borderRadius: 12, padding: 12 };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const probeTitle: React.CSSProperties = { fontWeight: 600 };
const pill: React.CSSProperties = { color: 'white', borderRadius: 999, padding: '2px 8px', fontSize: 12, display: 'inline-block' };
const detail: React.CSSProperties = { marginTop: 6, fontSize: 12, color: '#cbd5e1', wordBreak: 'break-word' };
const tiny: React.CSSProperties = { marginTop: 6, fontSize: 10, color: '#94a3b8' };
const notes: React.CSSProperties = { marginTop: 12, fontSize: 12, color: '#94a3b8', lineHeight: 1.6, paddingLeft: 18 };
