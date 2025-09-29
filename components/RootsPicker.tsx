'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

/**
 * RootsPicker — Province → District → Palika (Nagar/Gaun) → Ward → Tole
 * - Each dropdown appears only after the previous is chosen (“windows reveal gradually”).
 * - Tole dropdown loads saved toles for the chosen ward. If none (or not in the list), user can add a new tole inline.
 * - Works with our single-table geo design:
 *     public.geo_nodes(id, name_en, name_local, level, parent_id, sv, path_names)
 *     where level ∈ ('country','province','district','municipality','city','ward')
 *
 * Optional tole table (recommended; create when ready):
 *   create table if not exists public.geo_toles (
 *     id uuid primary key default gen_random_uuid(),
 *     ward_id uuid not null references public.geo_nodes(id) on delete cascade,
 *     name text not null,
 *     unique (ward_id, name)
 *   );
 *   -- RLS (reads open, inserts for authenticated):
 *   alter table public.geo_toles enable row level security;
 *   create policy "geo_toles_read" on public.geo_toles for select using (true);
 *   create policy "geo_toles_insert_auth" on public.geo_toles for insert with check (auth.role() = 'authenticated');
 *
 * If geo_toles doesn't exist yet, the component still works: user can type a tole and we return it in onComplete().
 */

type Node = {
  id: string;
  name_en: string;
  name_local: string | null;
  level: 'country' | 'province' | 'district' | 'municipality' | 'city' | 'ward';
  parent_id: string | null;
};

type Tole = { id?: string; name: string };

type RootsValue = {
  province?: Node | null;
  district?: Node | null;
  palika?: Node | null; // city/municipality
  ward?: Node | null;
  tole?: Tole | null;   // chosen or newly added
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ELI15: The only change needed to fix the build was removing the generic from `.from<Node>(...)`.
// We now call `.from('geo_nodes')` (no generic) and cast the result.
async function fetchChildrenByLevel(level: Node['level'], parentId: string | null) {
  const q = supabase
    .from('geo_nodes')
    .select('id,name_en,name_local,level,parent_id')
    .eq('level', level)
    .order('name_en', { ascending: true });

  const { data, error } = parentId
    ? await q.eq('parent_id', parentId)
    : await q.is('parent_id', null);

  if (error) throw error;
  return (data || []) as Node[];
}

async function fetchPalikas(parentDistrictId: string) {
  // Both 'city' and 'municipality' count as Palika (Nagar/Gaun)
  const { data, error } = await supabase
    .from('geo_nodes')
    .select('id,name_en,name_local,level,parent_id')
    .in('level', ['city', 'municipality'])
    .eq('parent_id', parentDistrictId)
    .order('level', { ascending: true })   // city first, then municipality
    .order('name_en', { ascending: true });

  if (error) throw error;
  return (data || []) as Node[];
}

async function fetchToles(wardId: string): Promise<Tole[]> {
  // Optional table. If missing, PostgREST returns error — we swallow and return empty.
  const { data, error } = await supabase
    .from('geo_toles')
    .select('id,name')
    .eq('ward_id', wardId)
    .order('name', { ascending: true });

  if (error) return [];
  return (data as { id: string; name: string }[]).map((r) => ({ id: r.id, name: r.name }));
}

async function upsertTole(wardId: string, name: string): Promise<Tole | null> {
  // If table or policy doesn’t exist yet, this will fail silently and we’ll just return a local tole.
  const { data, error } = await supabase
    .from('geo_toles')
    .insert([{ ward_id: wardId, name }])
    .select('id,name')
    .single();

  if (error) return { name }; // fall back to local-only result
  return { id: (data as any).id, name: (data as any).name };
}

function Field({
  label,
  hidden,
  children,
}: {
  label: string;
  hidden?: boolean;
  children: React.ReactNode;
}) {
  if (hidden) return null;
  return (
    <div className="space-y-1">
      <label className="block text-sm text-slate-300">{label}</label>
      {children}
    </div>
  );
}

export default function RootsPicker({
  onComplete,
  compact = false,
}: {
  onComplete?: (value: RootsValue) => void;
  compact?: boolean;
}) {
  // Selected nodes
  const [province, setProvince] = useState<Node | null>(null);
  const [district, setDistrict] = useState<Node | null>(null);
  const [palika, setPalika] = useState<Node | null>(null);
  const [ward, setWard] = useState<Node | null>(null);

  // Options
  const [provinces, setProvinces] = useState<Node[]>([]);
  const [districts, setDistricts] = useState<Node[]>([]);
  const [palikas, setPalikas] = useState<Node[]>([]);
  const [wards, setWards] = useState<Node[]>([]);
  const [toles, setToles] = useState<Tole[]>([]);

  // Tole UI
  const [toleMode, setToleMode] = useState<'select' | 'new'>('select');
  const [tole, setTole] = useState<Tole | null>(null);
  const [toleNew, setToleNew] = useState<string>('');
  const [savingTole, setSavingTole] = useState(false);

  // Load Provinces on mount
  useEffect(() => {
    (async () => {
      const list = await fetchChildrenByLevel('province', null);
      setProvinces(list);
    })();
  }, []);

  // When province changes → load districts
  useEffect(() => {
    setDistrict(null);
    setPalika(null);
    setWard(null);
    setDistricts([]);
    setPalikas([]);
    setWards([]);
    setToles([]);
    setTole(null);
    setToleMode('select');
    setToleNew('');

    if (!province) return;
    (async () => {
      const list = await fetchChildrenByLevel('district', province.id);
      setDistricts(list);
    })();
  }, [province]);

  // When district changes → load palikas
  useEffect(() => {
    setPalika(null);
    setWard(null);
    setPalikas([]);
    setWards([]);
    setToles([]);
    setTole(null);
    setToleMode('select');
    setToleNew('');

    if (!district) return;
    (async () => {
      const list = await fetchPalikas(district.id);
      setPalikas(list);
    })();
  }, [district]);

  // When palika changes → load wards
  useEffect(() => {
    setWard(null);
    setWards([]);
    setToles([]);
    setTole(null);
    setToleMode('select');
    setToleNew('');

    if (!palika) return;
    (async () => {
      const list = await fetchChildrenByLevel('ward', palika.id);
      setWards(list);
    })();
  }, [palika]);

  // When ward changes → load toles (if table exists)
  useEffect(() => {
    setToles([]);
    setTole(null);
    setToleMode('select');
    setToleNew('');
    if (!ward) return;
    (async () => {
      const list = await fetchToles(ward.id);
      setToles(list);
    })();
  }, [ward]);

  // Derived label for palika
  const palikaLabel = useMemo(() => {
    if (!district) return 'Palika';
    return 'Palika (Nagar/Gaun)';
  }, [district]);

  // Derived “complete” value
  useEffect(() => {
    if (!onComplete) return;
    onComplete({
      province: province || undefined,
      district: district || undefined,
      palika: palika || undefined,
      ward: ward || undefined,
      tole:
        tole ||
        (toleMode === 'new' && toleNew.trim() ? { name: toleNew.trim() } : undefined) ||
        undefined,
    });
  }, [province, district, palika, ward, tole, toleMode, toleNew, onComplete]);

  const baseCls = compact ? 'px-3 py-2 text-sm' : 'px-3 py-2 text-base';
  const wrapCls = compact ? 'space-y-3' : 'space-y-4';

  return (
    <div className={wrapCls}>
      {/* Province */}
      <Field label="Province">
        <select
          className={`w-full rounded-xl bg-white/5 border border-white/10 text-slate-100 ${baseCls}`}
          value={province?.id || ''}
          onChange={(e) => {
            const id = e.target.value;
            setProvince(provinces.find((p) => p.id === id) || null);
          }}
        >
          <option value="">Select Province…</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name_en}
            </option>
          ))}
        </select>
      </Field>

      {/* District */}
      <Field label="District" hidden={!province}>
        <select
          className={`w-full rounded-xl bg-white/5 border border-white/10 text-slate-100 ${baseCls}`}
          value={district?.id || ''}
          onChange={(e) => {
            const id = e.target.value;
            setDistrict(districts.find((d) => d.id === id) || null);
          }}
        >
          <option value="">Select District…</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_en}
            </option>
          ))}
        </select>
      </Field>

      {/* Palika (city/municipality) */}
      <Field label={palikaLabel} hidden={!district}>
        <select
          className={`w-full rounded-xl bg-white/5 border border-white/10 text-slate-100 ${baseCls}`}
          value={palika?.id || ''}
          onChange={(e) => {
            const id = e.target.value;
            setPalika(palikas.find((x) => x.id === id) || null);
          }}
        >
          <option value="">Select Palika…</option>
          {palikas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name_en} {p.level === 'city' ? ' (Nagar)' : ' (Gaun)'}
            </option>
          ))}
        </select>
      </Field>

      {/* Ward */}
      <Field label="Ward" hidden={!palika}>
        <select
          className={`w-full rounded-xl bg-white/5 border border-white/10 text-slate-100 ${baseCls}`}
          value={ward?.id || ''}
          onChange={(e) => {
            const id = e.target.value;
            setWard(wards.find((w) => w.id === id) || null);
          }}
        >
          <option value="">Select Ward…</option>
          {wards.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name_en}
            </option>
          ))}
        </select>
      </Field>

      {/* Tole */}
      <Field label="Tole / Area" hidden={!ward}>
        {/* Choice: pick from list or add new */}
        {toleMode === 'select' ? (
          <div className="space-y-2">
            <select
              className={`w-full rounded-xl bg-white/5 border border-white/10 text-slate-100 ${baseCls}`}
              value={tole?.name || ''}
              onChange={(e) => {
                const name = e.target.value;
                if (name === '__new__') {
                  setTole(null);
                  setToleMode('new');
                } else {
                  setTole(name ? { name } : null);
                }
              }}
            >
              <option value="">Select Tole…</option>
              {toles.map((t) => (
                <option key={t.id ?? t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
              <option value="__new__">➕ Add a new tole…</option>
            </select>
            {toles.length === 0 && (
              <p className="text-xs text-slate-400">
                No saved toles yet for this ward. Choose “Add a new tole…” to record one.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                className={`flex-1 rounded-xl bg-white/5 border border-white/10 text-slate-100 ${baseCls}`}
                placeholder="Type tole / neighborhood (e.g., Balaju, Chamati, Thamel)…"
                value={toleNew}
                onChange={(e) => setToleNew(e.target.value)}
              />
              <button
                className="px-4 rounded-xl bg-amber-400 text-black font-semibold disabled:opacity-50"
                disabled={!toleNew.trim() || !ward || savingTole}
                onClick={async () => {
                  if (!ward) return;
                  setSavingTole(true);
                  const saved = await upsertTole(ward.id, toleNew.trim());
                  setSavingTole(false);
                  setTole(saved ?? { name: toleNew.trim() });
                  setToleMode('select');
                  // refresh list to include the new tole if table exists
                  const list = await fetchToles(ward.id);
                  setToles(list);
                }}
              >
                {savingTole ? 'Saving…' : 'Save'}
              </button>
            </div>
            <button
              className="text-xs text-slate-400 underline"
              onClick={() => {
                setToleMode('select');
                setToleNew('');
              }}
            >
              ← Back to list
            </button>
          </div>
        )}
      </Field>

      {/* Final selection preview */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
        <div className="font-semibold mb-1">Your Roots</div>
        <div>
          {province?.name_en || '—'} › {district?.name_en || '—'} › {palika?.name_en || '—'} ›{' '}
          {ward?.name_en || '—'} › {tole?.name || (toleMode === 'new' && toleNew ? toleNew : '—')}
        </div>
      </div>
    </div>
  );
}
