// components/OnboardingFlow.jsx
// Gatishil — Digital Chauṭarī Onboarding (ONLY up to Screen 3)
// Safe for your current Supabase schema: DOES NOT write "surname".
// Fixes "n is not a function" by removing .maybeSingle() usage.

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Cropper from 'react-easy-crop';
import { supabase } from '../lib/supabaseClient';

const ChautariLocationPicker = dynamic(
  () =>
    import('./ChautariLocationPicker').catch(() => {
      const Fallback = () => (
        <div className="text-sm opacity-80">
          Location picker not found. (Add <code>components/ChautariLocationPicker.jsx</code> later.)
        </div>
      );
      // dynamic() accepts a component result — returning a component is fine.
      return Fallback;
    }),
  { ssr: false }
);

const STEP = {
  ENTRY: 'entry',
  NAME_PHOTO: 'name_photo',
  ROOTS: 'roots',
  LIVELIHOOD_IKIGAI: 'livelihood_ikigai',
};

const ringLimit = { skills: 8, passions: 6, needs: 6 };

const titleCase = (s) =>
  s
    ?.toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)\S/g, (t) => t.toUpperCase()) || '';

const dedupePush = (list, value, max) => {
  const v = titleCase(value);
  if (!v) return list;
  const exists = list.some((x) => x.toLowerCase() === v.toLowerCase());
  const next = exists ? list : [...list, v];
  return max ? next.slice(0, max) : next;
};

function useAuthUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);
  return user;
}

async function upsertProfileSafe(payload) {
  // Only columns guaranteed by your ikigai_schema.sql
  const allowed = [
    'user_id',
    'name',
    'photo_url',
    'roots_json',
    'diaspora_json',
    'livelihood',
    'skills',
    'passions',
    'needs',
    'viability',
    'transition_target',
    'updated_at',
  ];
  const clean = Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabase
    .from('profiles')
    .upsert(clean, { onConflict: 'user_id', ignoreDuplicates: false })
    .select();
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

async function getCroppedBlob(imageSrc, crop, zoom, maskCircle = true) {
  const image = await new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = imageSrc;
  });

  const outputSize = 512;
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');

  if (maskCircle) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
  }

  const scale = zoom || 1;
  const scaledW = image.width * scale;
  const scaledH = image.height * scale;
  const dx = (outputSize - scaledW) / 2 + (crop?.x || 0);
  const dy = (outputSize - scaledH) / 2 + (crop?.y || 0);

  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, outputSize, outputSize);
  ctx.drawImage(image, dx, dy, scaledW, scaledH);

  if (maskCircle) ctx.restore();

  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92));
}

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition ${
        active ? 'bg-amber-500 text-black border-amber-500' : 'border-white/20 hover:border-amber-400'
      }`}
    >
      {children}
    </button>
  );
}

function ChipsInput({ id, label, items, setItems, placeholder, max = 8 }) {
  const [value, setValue] = useState('');
  return (
    <div className="space-y-2">
      <label className="block text-sm opacity-80" htmlFor={id}>
        {label}
      </label>
      <div className="flex gap-2 flex-wrap">
        {items.map((it) => (
          <span key={it} className="px-2 py-1 rounded-full text-xs bg-white/10 border border-white/15">
            {it}{' '}
            <button
              type="button"
              onClick={() => setItems(items.filter((x) => x !== it))}
              className="opacity-70 hover:opacity-100 ml-1"
              aria-label={`Remove ${it}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <input
        id={id}
        className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 outline-none focus:border-amber-400"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (!value.trim()) return;
            setItems(dedupePush(items, value, max));
            setValue('');
          } else if (e.key === 'Backspace' && !value && items.length) {
            setItems(items.slice(0, -1));
          }
        }}
      />
      <div className="text-xs opacity-60">
        {items.length}/{max} • Press Enter to add
      </div>
    </div>
  );
}

function Typeahead({ id, label, value, setValue, rpcName, placeholder }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState([]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!rpcName) return;
      const { data, error } = await supabase.rpc(rpcName, { q });
      if (!alive) return;
      if (!error && Array.isArray(data)) setOpts(data);
      else setOpts([]);
    };
    const t = setTimeout(run, 160);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, rpcName]);

  return (
    <div className="space-y-2">
      <label className="block text-sm opacity-80" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 outline-none focus:border-amber-400"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          setValue(titleCase(v));
          setQ(v);
        }}
      />
      {opts?.length > 0 && (
        <div className="mt-1 border border-white/15 rounded-md bg-black/60 max-h-44 overflow-auto">
          {opts.map((o) => (
            <button
              type="button"
              key={o.id}
              className="w-full text-left px-3 py-2 hover:bg-white/5"
              onClick={() => {
                setValue(o.label);
                setQ(o.label);
                setOpts([]);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnboardingFlow() {
  const user = useAuthUser();
  const [step, setStep] = useState(STEP.ENTRY);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // Screen 1 — Name, Surname (client-only), Photo
  const [name, setName] = useState('');
  const [surname, setSurname] = useState(''); // client-only for now (no DB column)
  const [photoUrl, setPhotoUrl] = useState('');
  const [rawImage, setRawImage] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Screen 2 — Roots
  const [roots, setRoots] = useState(null); // { type:'ward'|'city', label, ... }

  // Screen 3 — Ikigai
  const [ikigaiTab, setIkigaiTab] = useState('Livelihood');
  const [livelihood, setLivelihood] = useState('');
  const [skills, setSkills] = useState([]);
  const [passions, setPassions] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [viability, setViability] = useState('');
  const [transitionTarget, setTransitionTarget] = useState('');

  // Prefill existing data (array-safe; no maybeSingle())
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'name, photo_url, roots_json, diaspora_json, livelihood, skills, passions, needs, viability, transition_target'
        )
        .eq('user_id', user.id);
      if (!error && Array.isArray(data) && data.length) {
        const row = data[0];
        setName(row.name || '');
        setPhotoUrl(row.photo_url || '');
        setRoots(row.roots_json || row.diaspora_json || null);
        setLivelihood(row.livelihood || '');
        setSkills(Array.isArray(row.skills) ? row.skills : []);
        setPassions(Array.isArray(row.passions) ? row.passions : []);
        setNeeds(Array.isArray(row.needs) ? row.needs : []);
        setViability(row.viability || '');
        setTransitionTarget(row.transition_target || '');
      }
    };
    load();
  }, [user]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  const nameOk = name.trim().length > 0;
  const surnameOk = surname.trim().length > 0; // required for UX, not persisted
  const photoOk = !!photoUrl || !!rawImage;
  const screen1Ready = nameOk && surnameOk && photoOk;

  const ikigaiReady =
    !!viability &&
    ((livelihood?.trim().length ?? 0) > 0 || skills.length > 0 || passions.length > 0 || needs.length > 0);

  const onSelectImage = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRawImage(reader.result.toString());
    reader.readAsDataURL(file);
  };

  const saveCroppedPhoto = useCallback(async () => {
    if (!user || !rawImage) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(rawImage, crop, zoom, true);
      const path = `profiles/${user.id}.jpg`;
      await supabase.storage.from('profiles').remove([path]).catch(() => {});
      const { error: upErr } = await supabase.storage.from('profiles').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('profiles').getPublicUrl(path);
      const url = pub?.publicUrl;
      if (!url) throw new Error('No public URL');

      await upsertProfileSafe({
        user_id: user.id,
        name: name.trim() || null,
        photo_url: url,
        updated_at: new Date().toISOString(),
      });

      setPhotoUrl(url);
      setRawImage('');
      showToast('Photo saved.');
    } catch (e) {
      console.error(e);
      showToast('Photo upload failed. Please try another image.');
    } finally {
      setBusy(false);
    }
  }, [user, rawImage, crop, zoom, name]);

  const saveNameOnly = useCallback(async () => {
    if (!user) return;
    try {
      await upsertProfileSafe({
        user_id: user.id,
        name: name.trim() || null,
        updated_at: new Date().toISOString(),
      });
      showToast('Saved.');
    } catch (e) {
      console.error(e);
      showToast('Save failed.');
    }
  }, [user, name]);

  const saveRoots = useCallback(
    async (rootsObj) => {
      if (!user) return;
      const payload = { user_id: user.id, updated_at: new Date().toISOString() };
      if (rootsObj?.type === 'ward') {
        payload.roots_json = rootsObj;
        payload.diaspora_json = null;
      } else if (rootsObj?.type === 'city') {
        payload.diaspora_json = rootsObj;
        payload.roots_json = null;
      }
      try {
        await upsertProfileSafe(payload);
        setRoots(rootsObj);
        showToast('Location saved.');
      } catch (e) {
        console.error(e);
        showToast('Could not save location.');
      }
    },
    [user]
  );

  const saveIkigai = useCallback(async () => {
    if (!user) return;
    try {
      await upsertProfileSafe({
        user_id: user.id,
        livelihood: livelihood?.trim() || null,
        skills,
        passions,
        needs,
        viability: viability || null,
        transition_target: transitionTarget?.trim() || null,
        updated_at: new Date().toISOString(),
      });
      showToast('Saved.');
    } catch (e) {
      console.error(e);
      showToast('Save failed.');
    }
  }, [user, livelihood, skills, passions, needs, viability, transitionTarget]);

  // --- UI: SCREENS (0–3 only) ---

  const ScreenEntry = (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">🌳 Welcome to the Chauṭarī</h1>
      <p className="opacity-80">Others are already sitting under the tree. Let’s introduce yourself.</p>
      <button
        className="px-4 py-2 rounded-lg bg-amber-500 text-black hover:bg-amber-400"
        onClick={() => setStep(STEP.NAME_PHOTO)}
      >
        Begin my circle
      </button>
    </div>
  );

  const ScreenNamePhoto = (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm opacity-80">Name (Given)</label>
          <input
            className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 outline-none focus:border-amber-400"
            placeholder="e.g., Nabin"
            value={name}
            onChange={(e) => setName(titleCase(e.target.value))}
            onBlur={saveNameOnly}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm opacity-80">Surname (Thar)</label>
          <input
            className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 outline-none focus:border-amber-400"
            placeholder="e.g., Pradhan"
            value={surname}
            onChange={(e) => setSurname(titleCase(e.target.value))}
          />
          <div className="text-xs opacity-60">
            (Kept on this device for now — DB will add a <code>surname</code> column later.)
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm opacity-80">Your Photo (round avatar)</label>

        {!rawImage && !photoUrl && (
          <div className="space-y-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onSelectImage(e.target.files?.[0])}
              className="block w-full text-sm"
            />
            <div className="text-xs opacity-60">Upload any image. You’ll crop it into a circle.</div>
          </div>
        )}

        {rawImage && (
          <div className="relative w-full aspect-square bg-black/40 rounded-lg overflow-hidden border border-white/10">
            <Cropper
              image={rawImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
            />
          </div>
        )}

        {photoUrl && !rawImage && (
          <div className="flex items-center gap-4">
            <img src={photoUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover border border-white/10" />
            <div className="space-x-2">
              <label className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onSelectImage(e.target.files?.[0])} />
                Re-crop
              </label>
            </div>
          </div>
        )}

        {rawImage && (
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50"
              disabled={busy}
              onClick={saveCroppedPhoto}
            >
              Save crop
            </button>
            <button
              className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15"
              disabled={busy}
              onClick={() => setRawImage('')}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="pt-2">
        <button
          className={`px-4 py-2 rounded-lg ${
            screen1Ready ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white/10 text-white/60 cursor-not-allowed'
          }`}
          disabled={!screen1Ready || busy}
          onClick={() => setStep(STEP.ROOTS)}
        >
          Continue
        </button>
      </div>
    </div>
  );

  const ScreenRoots = (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Where do your roots touch the earth?</h2>
      <ChautariLocationPicker
        value={roots}
        onChange={async (val) => {
          await saveRoots(val);
        }}
      />
      <div className="pt-2">
        <button
          className="px-4 py-2 rounded-lg bg-amber-500 text-black hover:bg-amber-400"
          onClick={() => setStep(STEP.LIVELIHOOD_IKIGAI)}
        >
          Continue
        </button>
      </div>
    </div>
  );

  const ScreenIkigai = (
    <IkigaiScreen
      ikigaiTab={ikigaiTab}
      setIkigaiTab={setIkigaiTab}
      livelihood={livelihood}
      setLivelihood={setLivelihood}
      skills={skills}
      setSkills={setSkills}
      passions={passions}
      setPassions={setPassions}
      needs={needs}
      setNeeds={setNeeds}
      viability={viability}
      setViability={setViability}
      transitionTarget={transitionTarget}
      setTransitionTarget={setTransitionTarget}
      ready={ikigaiReady}
      busy={busy}
      onSave={saveIkigai}
    />
  );

  return (
    <div className="min-h-[70vh] text-white">
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-8">
          {step === STEP.ENTRY && ScreenEntry}
          {step === STEP.NAME_PHOTO && ScreenNamePhoto}
          {step === STEP.ROOTS && ScreenRoots}
          {step === STEP.LIVELIHOOD_IKIGAI && ScreenIkigai}
        </div>
        <div className="mt-4 text-xs opacity-60">Step: {step.replaceAll('_', ' ')}</div>
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 border border-white/15 text-sm px-3 py-2 rounded-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function IkigaiScreen({
  ikigaiTab,
  setIkigaiTab,
  livelihood,
  setLivelihood,
  skills,
  setSkills,
  passions,
  setPassions,
  needs,
  setNeeds,
  viability,
  setViability,
  transitionTarget,
  setTransitionTarget,
  ready,
  busy,
  onSave,
}) {
  const [localSaved, setLocalSaved] = useState(false);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Let’s understand your work & gifts.</h2>

      <div className="flex gap-2 flex-wrap">
        {['Livelihood', 'Good At', 'Love', 'World Needs', 'Sustainability'].map((t) => (
          <Pill key={t} active={ikigaiTab === t} onClick={() => setIkigaiTab(t)}>
            {t}
          </Pill>
        ))}
      </div>

      {ikigaiTab === 'Livelihood' && (
        <div className="space-y-3">
          <Typeahead
            id="livelihood"
            label="What work do your hands and mind do?"
            value={livelihood}
            setValue={(v) => setLivelihood(titleCase(v))}
            rpcName="search_livelihoods"
            placeholder="Farmer, Teacher, Software Developer…"
          />
          <div className="flex gap-2 flex-wrap text-xs opacity-80">
            {['Farmer', 'Teacher', 'Software Developer', 'Driver', 'Tailor', 'Nurse', 'Shopkeeper', 'Carpenter'].map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  className="px-2 py-1 rounded-full bg-white/10 border border-white/15 hover:border-amber-400"
                  onClick={() => setLivelihood(s)}
                >
                  {s}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {ikigaiTab === 'Good At' && (
        <ChipsInput
          id="skills"
          label="What are you reliably good at?"
          items={skills}
          setItems={(v) => setSkills(v.slice(0, ringLimit.skills))}
          placeholder="Add a skill… (Enter)"
          max={ringLimit.skills}
        />
      )}

      {ikigaiTab === 'Love' && (
        <ChipsInput
          id="passions"
          label="What makes you feel alive lately?"
          items={passions}
          setItems={(v) => setPassions(v.slice(0, ringLimit.passions))}
          placeholder="Add a passion… (Enter)"
          max={ringLimit.passions}
        />
      )}

      {ikigaiTab === 'World Needs' && (
        <ChipsInput
          id="needs"
          label="What needs around you pull your heart?"
          items={needs}
          setItems={(v) => setNeeds(v.slice(0, ringLimit.needs))}
          placeholder="Add a community need… (Enter)"
          max={ringLimit.needs}
        />
      )}

      {ikigaiTab === 'Sustainability' && (
        <div className="space-y-3">
          <label className="block text-sm opacity-80">Is this sustaining you right now? (required)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { key: 'paid', label: 'Paid & stable' },
              { key: 'part_time', label: 'Part-time / side' },
              { key: 'learning', label: 'Learning / intern / volunteer' },
              { key: 'exploring', label: 'Exploring a shift' },
            ].map((o) => (
              <button
                key={o.key}
                type="button"
                className={`px-3 py-2 rounded-lg border ${
                  viability === o.key
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-white/5 border-white/15 hover:border-amber-400'
                }`}
                onClick={() => setViability(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>

          {(viability === 'learning' || viability === 'exploring') && (
            <Typeahead
              id="transition"
              label="Transition toward… (optional)"
              value={transitionTarget}
              setValue={(v) => setTransitionTarget(titleCase(v))}
              rpcName="search_livelihoods"
              placeholder="Type a target livelihood"
            />
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          className={`px-4 py-2 rounded-lg ${
            ready ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white/10 text-white/60 cursor-not-allowed'
          }`}
          disabled={!ready || busy}
          onClick={async () => {
            await onSave();
            setLocalSaved(true);
          }}
        >
          Save
        </button>
        {localSaved && <div className="text-xs opacity-70 self-center">Saved. You can add Screens 4–9 later.</div>}
      </div>
    </div>
  );
}
