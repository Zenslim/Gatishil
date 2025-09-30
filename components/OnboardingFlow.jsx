// components/OnboardingFlow.jsx
// Gatishil — Digital Chauṭarī Onboarding (Surname on Screen 1 + Ikigai on Screen 3)
// Remote-only: Next.js + Supabase + (optional) react-easy-crop for circle crop.
// Assumes you already have lib/supabaseClient and (optionally) components/ChautariLocationPicker.
// Storage policy expects: bucket "profiles", object key exactly `profiles/<auth.uid()>.jpg` (per your SQL).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { supabase } from '../lib/supabaseClient';
import dynamic from 'next/dynamic';

// If you have a heavy location picker, dynamic import keeps first paint snappy.
const ChautariLocationPicker = dynamic(
  () => import('./ChautariLocationPicker').catch(() => () => <div className="text-sm opacity-80">Location picker not found. (You can add it later.)</div>),
  { ssr: false }
);

const STEP = {
  ENTRY: 'entry',
  NAME_PHOTO: 'name_photo', // Screen 1
  ROOTS: 'roots',
  LIVELIHOOD_IKIGAI: 'livelihood_ikigai', // Screen 3 (integrated Ikigai)
  CIRCLES: 'circles',
  FAMILY: 'family',
  SOLIDARITY: 'solidarity',
  STORY: 'story',
  VOW: 'vow',
  REVEAL: 'reveal',
};

const ringLimit = {
  skills: 8,
  passions: 6,
  needs: 6,
  circles: 8,
};

const chipTitleCase = (s) =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)\S/g, (t) => t.toUpperCase());

function dedupePush(list, value, max) {
  const v = chipTitleCase(value);
  if (!v) return list;
  if (list.map((x) => x.toLowerCase()).includes(v.toLowerCase())) return list;
  const next = [...list, v];
  return max ? next.slice(0, max) : next;
}

async function getCroppedBlob(imageSrc, crop, zoom, circle = true) {
  // Create a canvas and draw the cropped area; if circle=true, mask as circle.
  const image = await new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = imageSrc;
  });

  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const canvas = document.createElement('canvas');
  const diameter = Math.min(image.width, image.height);
  const size = Math.round(diameter * pixelRatio);

  // We'll compute cropped rect using crop + zoom (approx based on react-easy-crop docs)
  // crop: { x: -translateXpx, y: -translateYpx } relative to image rendered size
  // To keep it robust, render image on large canvas and then cut out the square center
  const outputSize = 512; // final square size
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');

  // Fill transparent
  ctx.clearRect(0, 0, outputSize, outputSize);

  if (circle) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
  }

  // Compute scale for zoom
  // We approximate by scaling the image toward outputSize * zoom
  const scale = zoom || 1;
  const scaledW = image.width * scale;
  const scaledH = image.height * scale;

  // Translate according to crop.x/crop.y (react-easy-crop gives negative translate for moving image)
  // We'll draw the image centered, then apply crop translation
  const dx = (outputSize - scaledW) / 2 + (crop?.x || 0);
  const dy = (outputSize - scaledH) / 2 + (crop?.y || 0);

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, dx, dy, scaledW, scaledH);

  if (circle) ctx.restore();

  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92));
}

function useAuthUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);
  return user;
}

async function upsertProfile(payload) {
  // Upsert into public.profiles on conflict user_id (RLS requires auth user)
  const { data, error } = await supabase.from('profiles').upsert(payload, {
    onConflict: 'user_id',
    ignoreDuplicates: false,
  }).select().single();
  if (error) throw error;
  return data;
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

function ChipsInput({ label, items, setItems, placeholder, max = 8, onSuggest, id }) {
  const [value, setValue] = useState('');
  const add = useCallback(
    (v) => {
      const next = dedupePush(items, v, max);
      if (next.length !== items.length) setItems(next);
    },
    [items, setItems, max]
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm opacity-80" htmlFor={id}>{label}</label>
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
        onChange={async (e) => {
          const v = e.target.value;
          setValue(v);
          if (onSuggest) onSuggest(v);
        }}
        onKeyDown={async (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (!value.trim()) return;
            add(value);
            setValue('');
          } else if (e.key === 'Backspace' && !value && items.length) {
            setItems(items.slice(0, -1));
          }
        }}
      />
      <div className="text-xs opacity-60">{items.length}/{max} • Press Enter to add</div>
    </div>
  );
}

function Typeahead({ label, value, setValue, searchRpc, placeholder, id }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState([]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!searchRpc) return;
      const { data, error } = await supabase.rpc(searchRpc, { q });
      if (!active) return;
      if (!error && Array.isArray(data)) setOpts(data);
    };
    const t = setTimeout(run, 180);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q, searchRpc]);

  return (
    <div className="space-y-2">
      <label className="block text-sm opacity-80" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 outline-none focus:border-amber-400"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setQ(e.target.value);
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

  // FORM STATE
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [rawImage, setRawImage] = useState(''); // data URL for cropper
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const [roots, setRoots] = useState(null); // { type:'ward' | 'city', label, ... }

  // IKIGAI
  const [ikigaiTab, setIkigaiTab] = useState('Livelihood');
  const [livelihood, setLivelihood] = useState('');
  const [skills, setSkills] = useState([]);
  const [passions, setPassions] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [viability, setViability] = useState(''); // 'paid' | 'part_time' | 'learning' | 'exploring'
  const [transitionTarget, setTransitionTarget] = useState('');

  // Later screens
  const [circles, setCircles] = useState([]);
  const [family, setFamily] = useState('');
  const [offer, setOffer] = useState([]);
  const [needsMe, setNeedsMe] = useState([]);
  const [story, setStory] = useState('');
  const [vow, setVow] = useState('');

  // Prefill if profile exists
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        setName(data.name || '');
        setSurname(data.surname || ''); // will be ignored if column doesn’t exist; we still store in upsert payload
        setPhotoUrl(data.photo_url || '');
        setRoots(data.roots_json || data.diaspora_json || null);
        setLivelihood(data.livelihood || '');
        setSkills(Array.isArray(data.skills) ? data.skills : []);
        setPassions(Array.isArray(data.passions) ? data.passions : []);
        setNeeds(Array.isArray(data.needs) ? data.needs : []);
        setViability(data.viability || '');
        setTransitionTarget(data.transition_target || '');
        setCircles(Array.isArray(data.circles) ? data.circles : []);
        setFamily(data.family || '');
        setOffer(Array.isArray(data.offer) ? data.offer : []);
        setNeedsMe(Array.isArray(data.needs_me) ? data.needs_me : []);
        setStory(data.story || '');
        setVow(data.vow || '');
      }
    };
    load();
  }, [user]);

  const nameOk = name.trim().length > 0;
  const surnameOk = surname.trim().length > 0;
  const photoOk = !!photoUrl || !!rawImage; // either already saved URL or pending crop image

  const screen1Ready = nameOk && surnameOk && photoOk;

  const ikigaiReady =
    !!viability &&
    (
      (livelihood && livelihood.trim().length > 0) ||
      skills.length > 0 ||
      passions.length > 0 ||
      needs.length > 0
    );

  const vowReady = vow.trim().length > 0;

  // Helpers
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

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
      const path = `profiles/${user.id}.jpg`; // MUST match your storage RLS policy
      // Try delete existing silently (ignore errors)
      await supabase.storage.from('profiles').remove([path]).catch(() => {});
      const { error: upErr } = await supabase.storage.from('profiles').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true, // policy allows update if same path
      });
      if (upErr) throw upErr;

      const { data: publicUrlResult } = supabase.storage.from('profiles').getPublicUrl(path);
      const url = publicUrlResult?.publicUrl;
      if (!url) throw new Error('Could not get public URL for photo');

      // Upsert minimal profile fields early
      await upsertProfile({ user_id: user.id, name: name.trim() || null, surname: surname.trim() || null, photo_url: url, updated_at: new Date().toISOString() });
      setPhotoUrl(url);
      showToast('Photo saved.');
    } catch (e) {
      console.error(e);
      showToast('Photo upload failed. Please try another image.');
    } finally {
      setBusy(false);
    }
  }, [user, rawImage, crop, zoom, name, surname]);

  const saveNameSurname = useCallback(async () => {
    if (!user) return;
    try {
      await upsertProfile({
        user_id: user.id,
        name: name.trim() || null,
        surname: surname.trim() || null,
        updated_at: new Date().toISOString(),
      });
      showToast('Saved.');
    } catch (e) {
      console.error(e);
      showToast('Save failed.');
    }
  }, [user, name, surname]);

  const saveRoots = useCallback(async (rootsObj) => {
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
      await upsertProfile(payload);
      setRoots(rootsObj);
      showToast('Location saved.');
    } catch (e) {
      console.error(e);
      showToast('Could not save location.');
    }
  }, [user]);

  const saveIkigai = useCallback(async () => {
    if (!user) return;
    try {
      await upsertProfile({
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

  const saveCirclesFamilySolidarityStory = useCallback(async () => {
    if (!user) return;
    try {
      await upsertProfile({
        user_id: user.id,
        circles,
        family: family?.trim() || null,
        offer,
        needs_me: needsMe,
        story: story?.trim() || null,
        updated_at: new Date().toISOString(),
      });
      showToast('Saved.');
    } catch (e) {
      console.error(e);
      showToast('Save failed.');
    }
  }, [user, circles, family, offer, needsMe, story]);

  const finishProfile = useCallback(async () => {
    if (!user) return;
    // Validate requireds
    if (!nameOk || !surnameOk || !photoUrl) {
      showToast('Please complete Name, Surname and Photo.');
      setStep(STEP.NAME_PHOTO);
      return;
    }
    if (!roots?.label) {
      showToast('Please set your roots.');
      setStep(STEP.ROOTS);
      return;
    }
    if (!vowReady) {
      showToast('Pick your vow.');
      setStep(STEP.VOW);
      return;
    }
    setBusy(true);
    try {
      await upsertProfile({
        user_id: user.id,
        name: name.trim(),
        surname: surname.trim(),
        photo_url: photoUrl,
        roots_json: roots?.type === 'ward' ? roots : null,
        diaspora_json: roots?.type === 'city' ? roots : null,
        livelihood: livelihood?.trim() || null,
        skills,
        passions,
        needs,
        viability: viability || null,
        transition_target: transitionTarget?.trim() || null,
        circles,
        family: family?.trim() || null,
        offer,
        needs_me: needsMe,
        story: story?.trim() || null,
        vow: vow,
        updated_at: new Date().toISOString(),
      });
      setStep(STEP.REVEAL);
    } catch (e) {
      console.error(e);
      showToast('Could not finish. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [
    user, nameOk, surnameOk, photoUrl, roots, vowReady,
    name, surname, livelihood, skills, passions, needs,
    viability, transitionTarget, circles, family, offer, needsMe, story, vow
  ]);

  // UI — screens
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
            onChange={(e) => setName(chipTitleCase(e.target.value))}
            onBlur={saveNameSurname}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm opacity-80">Surname (Thar)</label>
          <input
            className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 outline-none focus:border-amber-400"
            placeholder="e.g., Pradhan"
            value={surname}
            onChange={(e) => setSurname(chipTitleCase(e.target.value))}
            onBlur={saveNameSurname}
          />
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
            <img
              src={photoUrl}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border border-white/10"
            />
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
          className={`px-4 py-2 rounded-lg ${screen1Ready ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white/10 text-white/60 cursor-not-allowed'}`}
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
      <ChautariLocationPicker value={roots} onChange={saveRoots} />
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
            setValue={(v) => setLivelihood(chipTitleCase(v))}
            searchRpc="search_livelihoods"
            placeholder="Farmer, Teacher, Software Developer…"
          />
          <div className="flex gap-2 flex-wrap text-xs opacity-80">
            {['Farmer','Teacher','Software Developer','Driver','Tailor','Nurse','Shopkeeper','Carpenter'].map((s) => (
              <button
                key={s}
                type="button"
                className="px-2 py-1 rounded-full bg-white/10 border border-white/15 hover:border-amber-400"
                onClick={() => setLivelihood(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {ikigaiTab === 'Good At' && (
        <ChipsInput
          id="skills"
          label="What are you reliably good at?"
          items={skills}
          setItems={setSkills}
          placeholder="Add a skill… (Enter)"
          max={ringLimit.skills}
          onSuggest={(q) => q && supabase.rpc('search_skills', { q })}
        />
      )}

      {ikigaiTab === 'Love' && (
        <ChipsInput
          id="passions"
          label="What makes you feel alive lately?"
          items={passions}
          setItems={setPassions}
          placeholder="Add a passion… (Enter)"
          max={ringLimit.passions}
          onSuggest={(q) => q && supabase.rpc('search_passions', { q })}
        />
      )}

      {ikigaiTab === 'World Needs' && (
        <ChipsInput
          id="needs"
          label="What needs around you pull your heart?"
          items={needs}
          setItems={setNeeds}
          placeholder="Add a community need… (Enter)"
          max={ringLimit.needs}
          onSuggest={(q) => q && supabase.rpc('search_needs', { q })}
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
                  viability === o.key ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/5 border-white/15 hover:border-amber-400'
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
              setValue={(v) => setTransitionTarget(chipTitleCase(v))}
              searchRpc="search_livelihoods"
              placeholder="Type a target livelihood"
            />
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          className={`px-4 py-2 rounded-lg ${ikigaiReady ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white/10 text-white/60 cursor-not-allowed'}`}
          disabled={!ikigaiReady || busy}
          onClick={async () => {
            await saveIkigai();
            setStep(STEP.CIRCLES);
          }}
        >
          Continue
        </button>
        <button
          className="px-4 py-2 rounded-lg bg-white/10 border border-white/15"
          disabled={busy}
          onClick={saveIkigai}
        >
          Save
        </button>
      </div>
    </div>
  );

  const ScreenCircles = (
    <div className="space-y-6">
      <ChipsInput
        id="circles"
        label="Circles & Affiliations"
        items={circles}
        setItems={(v) => setCircles(v.slice(0, ringLimit.circles))}
        placeholder="Add an affiliation… (Enter)"
        max={ringLimit.circles}
      />
      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded-lg bg-amber-500 text-black hover:bg-amber-400"
          onClick={() => setStep(STEP.FAMILY)}
        >
          Continue
        </button>
        <button className="px-4 py-2 rounded-lg bg-white/10 border border-white/15" onClick={saveCirclesFamilySolidarityStory}>
          Save
        </button>
      </div>
    </div>
  );

  const ScreenFamily = (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm opacity-80">Family / Kinship (optional)</label>
        <input
          className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 outline-none focus:border-amber-400"
          value={family}
          onChange={(e) => setFamily(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded-lg bg-amber-500 text-black hover:bg-amber-400"
          onClick={() => setStep(STEP.SOLIDARITY)}
        >
          Continue
        </button>
        <button className="px-4 py-2 rounded-lg bg-white/10 border border-white/15" onClick={saveCirclesFamilySolidarityStory}>
          Save
        </button>
      </div>
    </div>
  );

  const ScreenSolidarity = (
    <div className="space-y-6">
      <ChipsInput
        id="offer"
        label="What can you offer?"
        items={offer}
        setItems={setOffer}
        placeholder="Time, skills, resources… (Enter)"
        max={16}
      />
      <ChipsInput
        id="needsMe"
        label="What do you need?"
        items={needsMe}
        setItems={setNeedsMe}
        placeholder="Knowledge, help, connection… (Enter)"
        max={16}
      />
      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded-lg bg-amber-500 text-black hover:bg-amber-400"
          onClick={() => setStep(STEP.STORY)}
        >
          Continue
        </button>
        <button className="px-4 py-2 rounded-lg bg-white/10 border border-white/15" onClick={saveCirclesFamilySolidarityStory}>
          Save
        </button>
      </div>
    </div>
  );

  const ScreenStory = (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm opacity-80">Share your journey, struggles, or hopes… (~300 words)</label>
        <textarea
          rows={6}
          className="w-full bg-white/5 border border-white/15 rounded-md px-3 py-2 outline-none focus:border-amber-400"
          value={story}
          onChange={(e) => setStory(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded-lg bg-amber-500 text-black hover:bg-amber-400"
          onClick={() => setStep(STEP.VOW)}
        >
          Continue
        </button>
        <button className="px-4 py-2 rounded-lg bg-white/10 border border-white/15" onClick={saveCirclesFamilySolidarityStory}>
          Save
        </button>
      </div>
    </div>
  );

  const vows = ['Courage','Livelihood','Justice','Transparency','Solidarity','Servitude','Culture','Freedom'];

  const ScreenVow = (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Pick the vow that resonates today</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {vows.map((v) => (
          <button
            key={v}
            type="button"
            className={`px-3 py-2 rounded-lg border ${
              vow === v ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/5 border-white/15 hover:border-amber-400'
            }`}
            onClick={() => setVow(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="pt-2">
        <button
          className={`px-4 py-2 rounded-lg ${vowReady ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white/10 text-white/60 cursor-not-allowed'}`}
          disabled={!vowReady || busy}
          onClick={finishProfile}
        >
          Finish my profile
        </button>
      </div>
    </div>
  );

  const ScreenReveal = (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <img
          src={photoUrl}
          alt=""
          className="w-32 h-32 rounded-full object-cover border border-white/10"
        />
      </div>
      <h2 className="text-xl font-semibold">✨ Your circle is alive.</h2>
      <p className="opacity-80">{name} {surname}</p>
      <a href="/members" className="inline-block mt-2 px-4 py-2 rounded-lg bg-amber-500 text-black hover:bg-amber-400">
        Enter the Chauṭarī
      </a>
    </div>
  );

  return (
    <div className="min-h-[70vh] text-white">
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-8">
          {step === STEP.ENTRY && ScreenEntry}
          {step === STEP.NAME_PHOTO && ScreenNamePhoto}
          {step === STEP.ROOTS && ScreenRoots}
          {step === STEP.LIVELIHOOD_IKIGAI && ScreenIkigai}
          {step === STEP.CIRCLES && ScreenCircles}
          {step === STEP.FAMILY && ScreenFamily}
          {step === STEP.SOLIDARITY && ScreenSolidarity}
          {step === STEP.STORY && ScreenStory}
          {step === STEP.VOW && ScreenVow}
          {step === STEP.REVEAL && ScreenReveal}
        </div>

        {/* Footer nav (minimal) */}
        <div className="mt-4 text-xs opacity-60">
          Step: {step.replaceAll('_',' ')}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 border border-white/15 text-sm px-3 py-2 rounded-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
