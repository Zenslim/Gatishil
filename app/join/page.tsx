// app/join/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Person = {
  name: string;
  region: string;
  skills: string[];
  phone?: string | null;
  role?: string | null;
  memberKey?: string;
};

export default function JoinPage() {
  const [step, setStep] = useState<'form' | 'issued'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [memberKey, setMemberKey] = useState<string | null>(null);

  // lightweight suggestions (no deps)
  const regionHints = useMemo(
    () => [
      'Kathmandu',
      'Lalitpur (Patan)',
      'Bhaktapur',
      'Pokhara',
      'Boston, USA',
      'Sydney, AUS',
      'Doha, QAT',
    ].filter((r) => region && r.toLowerCase().includes(region.toLowerCase())),
    [region]
  );

  const skillHints = useMemo(() => {
    const last = skillsInput.split(',').pop()?.trim().toLowerCase() || '';
    const base = ['organizing', 'coding', 'design', 'finance', 'legal', 'healing', 'storytelling'];
    return last ? base.filter((s) => s.includes(last) && !skills.includes(s)) : [];
  }, [skillsInput, skills]);

  function addSkill(s: string) {
    const clean = s.trim();
    if (!clean) return;
    const parts = skillsInput
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const last = parts.pop();
    const final = [...new Set([...skills, (s || last || '').trim()])].filter(Boolean);
    setSkills(final);
    setSkillsInput(final.join(', ') + ', ');
  }

  function removeSkill(s: string) {
    const next = skills.filter((k) => k !== s);
    setSkills(next);
    setSkillsInput(next.length ? next.join(', ') + ', ' : '');
  }

  function makeKey(base: string) {
    const slug = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 28);
    const rand = Math.random().toString(36).slice(2, 7);
    return `${slug}-${rand}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!agree) {
      setErr('Please accept the founding promise to continue.');
      return;
    }
    if (!name || !region || skills.length === 0) {
      setErr('Name, region, and at least one skill are required.');
      return;
    }

    setSubmitting(true);
    try {
      const profile: Person = {
        name: name.trim(),
        region: region.trim(),
        skills,
        phone: phone.trim() || null,
        role: 'Member',
      };

      const key = makeKey(`${profile.name}-${profile.region}`);
      profile.memberKey = key;

      // 1) Store locally for instant UX + recovery
      try {
        localStorage.setItem('gatishil.memberKey', key);
        localStorage.setItem('gatishil.memberProfile', JSON.stringify(profile));
      } catch {}

      // 2) Try to inform backend (non-blocking if POST isn’t implemented yet)
      try {
        await fetch('/api/people', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(profile),
        });
      } catch {}

      setMemberKey(key);
      setStep('issued');
    } catch (e: any) {
      setErr('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    // Press Enter to confirm last skill quickly
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && (document.activeElement as HTMLElement)?.id === 'skills') {
        e.preventDefault();
        addSkill('');
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [skillsInput, skills]);

  return (
    <main style={sx.page}>
      <div style={sx.glow} />
      <section style={sx.box}>
        <div style={sx.head}>
          <div style={sx.badge}>✅ Gatishil</div>
          <h1 style={sx.h1}>Join Gatishil Loktantric Movement</h1>
          <p style={sx.sub}>
            One Ledger. Six Registers. <b>Build first, then speak.</b>
          </p>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit} style={sx.form}>
            {/* Name */}
            <label style={sx.label}>🪶 Your Name</label>
            <input
              style={sx.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Nabin"
              required
            />

            {/* Region */}
            <label style={sx.label}>🌍 Where do you serve from?</label>
            <input
              style={sx.input}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g., Patan, Kathmandu — or Boston, USA"
              required
            />
            {region && regionHints.length > 0 && (
              <div style={sx.hints}>
                {regionHints.map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRegion(r)}
                    style={sx.hintBtn}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {/* Skills */}
            <label style={sx.label}>🤲 What can you offer right now?</label>
            <input
              id="skills"
              style={sx.input}
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="e.g., organizing, coding, finance"
              required
            />
            {skillHints.length > 0 && (
              <div style={sx.hints}>
                {skillHints.map((s) => (
                  <button type="button" key={s} onClick={() => addSkill(s)} style={sx.hintBtn}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {skills.length > 0 && (
              <div style={sx.tags}>
                {skills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => removeSkill(s)}
                    title="Remove"
                    style={sx.tag}
                  >
                    {s} ✕
                  </button>
                ))}
              </div>
            )}

            {/* Phone (optional) */}
            <label style={sx.label}>📱 Recovery Number (optional)</label>
            <input
              style={sx.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+97798XXXXXXXX"
              inputMode="tel"
            />
            <p style={sx.help}>
              We never market via this number. It’s only for recovery if you misplace your key.
            </p>

            {/* Promise */}
            <label style={{ ...sx.label, display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                aria-label="I agree"
              />
              <span>
                I align with the founding promise: <i>Compassion over friction • Clarity over
                complexity • Proof over promises</i>.
              </span>
            </label>

            {err && <div style={sx.err}>{err}</div>}

            <button disabled={submitting} style={sx.submit}>
              {submitting ? 'Planting your seed…' : '🌱 Join Now'}
            </button>

            <div style={sx.links}>
              <Link href="/members">See Members</Link>
              <span>·</span>
              <Link href="/status">System Status</Link>
            </div>
          </form>
        )}

        {step === 'issued' && (
          <section style={sx.issued}>
            <h2 style={sx.h2}>🌿 Seed planted</h2>
            <p>Your Gatishil key (saved in this browser):</p>
            <code style={sx.key}>{memberKey}</code>
            <p style={{ opacity: 0.85, marginTop: 10 }}>
              Keep this safe. You can add a passkey later for one-tap sign-in on this device.
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/members" style={sx.primaryBtn}>🚀 Go to Members</Link>
              <Link href="/" style={sx.ghostBtn}>⟲ Back to Home</Link>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

const sx: { [k: string]: React.CSSProperties } = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(1200px 600px at 50% -10%, rgba(16,185,129,0.25), transparent), #000',
    color: '#fff',
    position: 'relative',
    padding: '40px 16px',
  },
  glow: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(600px 300px at 80% 0%, rgba(59,130,246,0.22), transparent)',
    pointerEvents: 'none',
  },
  box: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 720,
    margin: '0 auto',
    padding: 18,
  },
  head: { textAlign: 'center', marginBottom: 16 },
  badge: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: 999,
    background: 'rgba(16,185,129,0.12)',
    border: '1px solid rgba(16,185,129,0.35)',
    fontSize: 12,
    letterSpacing: 1.2,
  },
  h1: { fontSize: 34, fontWeight: 900, margin: '10px 0 6px' },
  sub: { opacity: 0.9 },

  form: {
    background: 'linear-gradient(180deg,#0f172a,#0b1222)',
    border: '1px solid #1f2a44',
    borderRadius: 16,
    padding: 18,
    display: 'grid',
    gap: 12,
  },
  label: { fontWeight: 700, marginTop: 4 },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
  },
  hints: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  hintBtn: {
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    cursor: 'pointer',
  },
  tags: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  tag: {
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    cursor: 'pointer',
  },
  help: { fontSize: 12, opacity: 0.8, marginTop: -4 },
  err: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.35)',
    padding: '8px 10px',
    borderRadius: 10,
    color: '#fecaca',
    fontSize: 14,
  },
  submit: {
    padding: '12px 18px',
    borderRadius: 12,
    fontWeight: 800,
    border: '1px solid rgba(16,185,129,0.5)',
    background: 'linear-gradient(90deg,#22c55e,#10b981)',
    color: '#00140a',
    boxShadow: '0 10px 30px rgba(34,197,94,0.25)',
    cursor: 'pointer',
  },
  links: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
    opacity: 0.9,
    fontSize: 14,
  },

  issued: {
    background: 'linear-gradient(180deg,#0f172a,#0b1222)',
    border: '1px solid #1f2a44',
    borderRadius: 16,
    padding: 20,
    textAlign: 'center',
  },
  h2: { fontSize: 24, fontWeight: 900, marginBottom: 6 },
  key: {
    display: 'inline-block',
    marginTop: 8,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
  },
  primaryBtn: {
    padding: '10px 14px',
    borderRadius: 12,
    fontWeight: 800,
    background: 'rgba(255,255,255,0.95)',
    color: '#000',
    textDecoration: 'none',
  },
  ghostBtn: {
    padding: '10px 14px',
    borderRadius: 12,
    fontWeight: 800,
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    textDecoration: 'none',
    border: '1px solid rgba(255,255,255,0.12)',
  },
};
