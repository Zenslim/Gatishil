"use client";
export const dynamic = "force-dynamic";
export const revalidate = false;

// app/status/page.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

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

  useEffect(() => {
    const run = async () => {
      const results: Probe[] = [];

      // 1) ENV presence
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
      const authStart = performance.now();
      try {
        const { error } = await supabase.auth.getSession();
        const authEnd = performance.now();
        results.push({
          label: 'Supabase Auth reachable',
          ok: !error,
          detail: error ? error.message : 'ok',
          ms: Math.round(authEnd - authStart),
        });
      } catch (e: any) {
        const authEnd = performance.now();
        results.push({
          label: 'Supabase Auth reachable',
          ok: false,
          detail: e?.message || 'unknown error',
          ms: Math.round(authEnd - authStart),
        });
      }

      // 3) Safe DB probe (treat "no table yet" as OK during bootstrap)
      const dbStart = performance.now();
      let ok = false;
      let detail = '';
      try {
        // try profiles first
        const { data, error, status } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);

        if (error) {
          const notFound =
            (error as any)?.code === '42P01' || // relation does not exist
            status === 404 ||
            /relation .* does not exist/i.test(error.message) ||
            /schema cache/i.test(error.message);

          if (notFound) {
            // try users as an alternate common table name
            const retry = await supabase.from('users').select('id').limit(1);
            if (retry.error) {
              const alsoNotFound =
                (retry.error as any)?.code === '42P01' ||
                retry.status === 404 ||
                /relation .* does not exist/i.test(retry.error.message) ||
                /schema cache/i.test(retry.error.message);

              if (alsoNotFound) {
                // ✅ Bootstrap mode: No tables yet is acceptable for health
                ok = true;
                detail =
                  'No public tables yet — bootstrap mode (OK: skipped). Create tables later.';
              } else {
                ok = false;
                detail = `users error: ${retry.error.message} (status ${retry.status})`;
              }
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
        // If server says table/view missing in any other phrasing, still skip as OK.
        const msg = `${e?.message || ''}`;
        if (/relation .* does not exist/i.test(msg) || /schema cache/i.test(msg)) {
          ok = true;
          detail =
            'No public tables yet — bootstrap mode (OK: skipped). Create tables later.';
        } else {
          ok = false;
          detail = msg || 'unknown db error';
        }
      }
      const dbEnd = performance.now();
      results.push({
        label: 'Database probe (bootstrap-safe)',
        ok,
        detail,
        ms: Math.round(dbEnd - dbStart),
      });

      setProbes(results);
    };

    run();
  }, [supabaseUrl, supabaseAnonKey]);

  const allGood =
    probes.length > 0 &&
    probes.every((p) => p.ok) &&
    // require at least env + auth to be OK
    probes.slice(0, 3).every((p) => p.ok);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-slate-100 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          🌿 Gatishil — System Status
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Deployed on Vercel. This page checks envs, Supabase Auth, and a light DB probe (bootstrap-safe).
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
            <li>
              <span className="text-slate-400">Mode: </span>
              Bootstrap-friendly (DB optional)
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
                  <div className="mt-1 text-xs text-slate-300 break-words">{p.detail}</div>
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
              During bootstrap, “no tables yet” is treated as OK. Later, create your tables and this probe will show real visibility.
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

type Timer = () => number;

const now = () =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

function startTimer(): Timer {
  const started = now();
  return () => Math.round(now() - started);
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
