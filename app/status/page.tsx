// src/app/status/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Probe = {
  label: string;
  ok: boolean;
  detail?: string;
  ms?: number;
};

export default function StatusPage() {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [startedAt] = useState<number>(() => Date.now());

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // build a lightweight client here so you don’t need any other files
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    const run = async () => {
      const results: Probe[] = [];

      // 1) ENV presence (remote sanity check)
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

      // 2) Supabase Auth ping (does not require any tables/RLS)
      if (supabase) {
        const t0 = performance.now();
        try {
          const { data, error } = await supabase.auth.getSession();
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

      // 3) Safe DB probe (tries profiles then users; both optional)
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
            // if profiles not found, try users
            const notFound =
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
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-slate-100 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          🌿 Gatishil — System Status
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Deployed on Vercel. This page checks envs, Supabase Auth, and a light DB probe.
        </p>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 mb-6">
          <h2 className="font-semibold mb-2">Build & Env</h2>
          <ul className="text-sm space-y-1">
            <li>
              <span className="text-slate-400">Build started: </span>
              {new Date(startedAt).toLocaleString()}
            </li>
            <li>
              <span className="text-slate-400">Runtime: </span>Next.js App Router (client check)
            </li>
            <li>
              <span className="text-slate-400">Repo: </span>GitHub → Vercel (auto-deploy)
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="font-semibold mb-3">Probes</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {probes.map((p, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-3 border ${
                  p.ok
                    ? 'border-emerald-700 bg-emerald-900/20'
                    : 'border-rose-700 bg-rose-900/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.label}</div>
                  <div
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      p.ok ? 'bg-emerald-700' : 'bg-rose-700'
                    }`}
                  >
                    {p.ok ? 'OK' : 'FAIL'}
                  </div>
                </div>
                {p.detail && (
                  <div className="mt-1 text-xs text-slate-300 break-words">
                    {p.detail}
                  </div>
                )}
                {typeof p.ms === 'number' && (
                  <div className="mt-1 text-[10px] text-slate-400">{p.ms} ms</div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm">
            <span className="mr-2">Overall:</span>
            <span
              className={`px-2 py-0.5 rounded ${
                allGood ? 'bg-emerald-700' : 'bg-amber-700'
              }`}
            >
              {allGood ? 'Healthy' : 'Needs review'}
            </span>
          </div>

          <ol className="mt-4 text-xs text-slate-400 list-disc pl-5 space-y-1">
            <li>
              If envs are missing, add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel → Project → Settings → Environment Variables.
            </li>
            <li>
              If DB probe fails with “relation does not exist,” it just means your table isn’t created or is named differently.
              The app itself is fine—create tables or adjust queries later.
            </li>
            <li>
              If Auth fails, confirm the anon key is correct and the project’s URL matches Supabase settings.
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}

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
