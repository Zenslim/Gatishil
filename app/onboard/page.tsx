// app/onboard/page.tsx — Progressive Profile (post-auth)
// Remote-only (GitHub + Vercel + Supabase). No local steps.
// Collects: First Name, Family Name, Phone (read-only if present), Location, Occupation, Skills.
// Writes into `public.people` by matching the signed-in user (created_by = auth.uid).
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Option = { value: string; label: string };

const OCCUPATIONS: Option[] = [
  { value: 'farmer', label: 'Farmer' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'artisan', label: 'Artisan' },
  { value: 'organizer', label: 'Organizer' },
  { value: 'student', label: 'Student' },
  { value: 'other', label: 'Other' },
];

const SKILLS: Option[] = [
  { value: 'agro', label: 'Agro / Livestock' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'weaving', label: 'Weaving' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'healing', label: 'Healing' },
  { value: 'teaching', label: 'Teaching' },
  { value: 'organizing', label: 'Organizing' },
  { value: 'it', label: 'IT / Mobile' },
];

export default function OnboardPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // form
  const [firstName, setFirstName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [occupation, setOccupation] = useState<Option | null>(null);
  const [skills, setSkills] = useState<Option[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErr('Please sign in first.'); setLoading(false); return; }
      setUserId(user.id || null);

      // Try to read an existing people row for this user
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .eq('created_by', user.id)
        .limit(1)
        .maybeSingle();

      if (error && String(error.message).toLowerCase().includes('permission')) {
        setErr('Permission issue loading your profile.'); setLoading(false); return;
      }

      if (data) {
        // prefill
        const fullName = (data.name || '').trim();
        if (fullName && !firstName && !familyName) {
          const parts = fullName.split(/\s+/);
          setFirstName(parts[0] ?? '');
          setFamilyName(parts.slice(1).join(' ') ?? '');
        }
        setPhone(data.phone ?? null);
        setLocation(data.location ?? '');
        if (data.occupation) {
          const match = OCCUPATIONS.find(o => o.value === data.occupation) || { value: 'other', label: 'Other' };
          setOccupation(match);
        }
        if (Array.isArray(data.skills)) {
          const mapped = data.skills
            .map((v: string) => SKILLS.find(s => s.value === v))
            .filter(Boolean) as Option[];
          setSkills(mapped);
        }
      } else {
        // no row yet — we can attempt to read phone/email from auth metadata
        const phoneMeta = (user.phone ?? user.user_metadata?.phone) || null;
        setPhone(phoneMeta);
      }
      setLoading(false);
    })();
  }, [supabase]); // run once

  const handleSave = async () => {
    setMsg(null); setErr(null);
    if (!userId) { setErr('Not signed in.'); return; }

    const name = [firstName, familyName].filter(Boolean).join(' ').trim() || phone || 'Member';
    const payload: any = {
      name,
      first_name: firstName || null,
      family_name: familyName || null,
      phone: phone || null,
      location: location || null,
      occupation: occupation?.value || null,
      skills: skills.map(s => s.value),
      created_by: userId,
    };

    setLoading(true);
    try {
      // Upsert semantics: try update by created_by; if none, insert
      const { data: existing } = await supabase
        .from('people')
        .select('id')
        .eq('created_by', userId)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const { error: uerr } = await supabase.from('people').update(payload).eq('id', existing.id);
        if (uerr) { setErr(uerr.message); return; }
      } else {
        const { error: ierr } = await supabase.from('people').insert([payload]);
        if (ierr) { setErr(ierr.message); return; }
      }
      setMsg('Saved. Thank you for completing your profile!');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return screenWrap(<div>Loading…</div>);
  if (err) return screenWrap(
    <div>
      <div style={{color:'#ffb4b4', marginBottom:8}}>Error: {err}</div>
      <a href="/join" style={linkBtn}>Go to Join</a>
    </div>
  );

  return screenWrap(
    <div style={card}>
      <h1 style={h1}>Complete Your Profile</h1>
      <p style={p}>This helps match you with local work, training, and community tasks.</p>

      <label style={label}>Your Personal Name (First Name)</label>
      <input style={input} value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="e.g., Nabin" />

      <label style={label}>Your Family Name (Surname)</label>
      <input style={input} value={familyName} onChange={e=>setFamilyName(e.target.value)} placeholder="e.g., Pradhan" />

      <label style={label}>Phone (from sign-in)</label>
      <input style={{...input, opacity:.75}} value={phone ?? ''} readOnly placeholder="+97798XXXXXXXX" />

      <label style={label}>Location</label>
      <input style={input} value={location} onChange={e=>setLocation(e.target.value)} placeholder="Village / Ward / City" />

      <label style={label}>Occupation</label>
      <SelectOne value={occupation} onChange={setOccupation} options={OCCUPATIONS} placeholder="Choose one" />

      <label style={label}>Skills / Interests</label>
      <SelectMulti value={skills} onChange={setSkills} options={SKILLS} placeholder="Select one or more" />

      <button onClick={handleSave} style={primaryBtn}>Save</button>
      {msg && <div style={{marginTop:10, fontSize:14}}>{msg}</div>}

      <div style={{marginTop:16}}>
        <a href="/members" style={linkBtn}>← Back to Members</a>
      </div>
    </div>
  );
}

/** UI helpers */
function screenWrap(children: React.ReactNode) {
  return (
    <div style={{minHeight:'100dvh', display:'grid', placeItems:'center', background:'#0b1020', color:'#e6f0ff', padding:'24px'}}>
      {children}
    </div>
  );
}
const card: React.CSSProperties = { width:'100%', maxWidth:560, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:20, boxShadow:'0 10px 30px rgba(0,0,0,0.4)' };
const h1: React.CSSProperties = { fontSize:28, fontWeight:800, marginBottom:6 };
const p: React.CSSProperties = { opacity:.85, marginBottom:16 };
const label: React.CSSProperties = { display:'block', margin:'12px 4px 6px', opacity:.8, fontSize:13 };
const input: React.CSSProperties = { width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)', color:'#e6f0ff' };
const primaryBtn: React.CSSProperties = { marginTop:12, width:'100%', padding:'12px', borderRadius:12, background:'#16a34a', color:'white', border:'none', fontWeight:800 };
const linkBtn: React.CSSProperties = { display:'inline-block', padding:'10px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', textDecoration:'none', color:'#e6f0ff' };

/** Tiny select components (no external UI libs) */
function SelectOne({ value, onChange, options, placeholder }:{
  value: Option | null;
  onChange: (o: Option | null)=>void;
  options: Option[];
  placeholder?: string;
}) {
  return (
    <div style={{display:'flex', gap:8}}>
      <select
        value={value?.value ?? ''}
        onChange={(e)=>{
          const v = e.target.value;
          const found = options.find(o=>o.value===v) || null;
          onChange(found);
        }}
        style={{...input, flex:1}}
      >
        <option value="">{placeholder || 'Select'}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SelectMulti({ value, onChange, options, placeholder }:{
  value: Option[];
  onChange: (o: Option[])=>void;
  options: Option[];
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const filtered = options.filter(o =>
    !value.some(v=>v.value===o.value) &&
    (text.trim()==='' || o.label.toLowerCase().includes(text.toLowerCase()))
  );

  return (
    <div>
      <input
        style={{...input, marginBottom:8}}
        value={text}
        onChange={e=>setText(e.target.value)}
        placeholder={placeholder || 'Type to filter…'}
      />
      <div style={{display:'flex', flexWrap:'wrap', gap:8, marginBottom:8}}>
        {value.map(v => (
          <span key={v.value} style={{padding:'6px 10px', borderRadius:999, border:'1px solid rgba(255,255,255,0.12)'}}>
            {v.label} <button onClick={()=>onChange(value.filter(x=>x.value!==v.value))} style={chipBtn}>×</button>
          </span>
        ))}
      </div>
      <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
        {filtered.map(o => (
          <button key={o.value} onClick={()=>onChange([...value, o])} style={chipOpt}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
const chipBtn: React.CSSProperties = { marginLeft:6, background:'transparent', border:'none', color:'#e6f0ff', cursor:'pointer' };
const chipOpt: React.CSSProperties = { padding:'6px 10px', borderRadius:999, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)', cursor:'pointer' };
