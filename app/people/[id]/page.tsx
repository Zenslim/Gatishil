// Person Profile — capture HR sub-records inline
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Card from '@/components/Card';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Person = {
  id: string; name: string; email?: string|null; role?: string|null; position?: string|null; category?: string|null;
};

async function fetchAll(personId: string) {
  const [p, edu, hist, links, socials, notes, pOrgs, pProjs, grades] = await Promise.all([
    supabaseBrowser.from('people').select('*').eq('id', personId).single(),
    supabaseBrowser.from('person_education').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
    supabaseBrowser.from('person_history').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
    supabaseBrowser.from('person_links').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
    supabaseBrowser.from('person_socials').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
    supabaseBrowser.from('person_notes').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
    supabaseBrowser.from('person_orgs').select('*, orgs(*)').eq('person_id', personId).order('created_at', { ascending: false }),
    supabaseBrowser.from('person_projects').select('*, projects(*)').eq('person_id', personId).order('created_at', { ascending: false }),
    supabaseBrowser.from('person_grades').select('*').eq('person_id', personId).order('created_at', { ascending: false }),
  ]);
  return { p, edu, hist, links, socials, notes, pOrgs, pProjs, grades };
}

export default function PersonProfilePage() {
  const params = useParams();
  const personId = String(params?.id ?? '');
  const [person, setPerson] = useState<Person|null>(null);
  const [edu, setEdu] = useState<any[]>([]);
  const [hist, setHist] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [socials, setSocials] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [pOrgs, setPOrgs] = useState<any[]>([]);
  const [pProjs, setPProjs] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  // form states
  const [eduForm, setEduForm] = useState({ level:'', field:'', institution:'', start_year:'', end_year:'', notes:'' });
  const [histForm, setHistForm] = useState({ title:'', org:'', start_date:'', end_date:'', description:'' });
  const [linkForm, setLinkForm] = useState({ label:'', url:'', kind:'link' });
  const [socForm, setSocForm] = useState({ network:'linkedin', handle:'', url:'' });
  const [noteForm, setNoteForm] = useState({ body:'' });
  const [orgForm, setOrgForm] = useState({ name:'', role:'member' });
  const [projForm, setProjForm] = useState({ name:'', role:'contributor' });

  async function load() {
    try {
      setLoading(true);
      const all = await fetchAll(personId);
      if (all.p.error) throw all.p.error;
      setPerson(all.p.data as any);
      setEdu(all.edu.data || []);
      setHist(all.hist.data || []);
      setLinks(all.links.data || []);
      setSocials(all.socials.data || []);
      setNotes(all.notes.data || []);
      setPOrgs(all.pOrgs.data || []);
      setPProjs(all.pProjs.data || []);
      setGrades(all.grades.data || []);
    } catch (e:any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (personId) load(); }, [personId]);

  if (!personId) return <Card title="Person">Invalid person id</Card>;

  async function addEducation(e: React.FormEvent) {
    e.preventDefault();
    const row = { person_id: personId, ...eduForm, start_year: eduForm.start_year? Number(eduForm.start_year): null, end_year: eduForm.end_year? Number(eduForm.end_year): null };
    const { error } = await supabaseBrowser.from('person_education').insert([row]);
    if (!error) { setEduForm({ level:'', field:'', institution:'', start_year:'', end_year:'', notes:'' }); load(); }
  }
  async function addHistory(e: React.FormEvent) {
    e.preventDefault();
    const row = { person_id: personId, ...histForm, start_date: histForm.start_date || null, end_date: histForm.end_date || null };
    const { error } = await supabaseBrowser.from('person_history').insert([row]);
    if (!error) { setHistForm({ title:'', org:'', start_date:'', end_date:'', description:'' }); load(); }
  }
  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    const row = { person_id: personId, ...linkForm };
    const { error } = await supabaseBrowser.from('person_links').insert([row]);
    if (!error) { setLinkForm({ label:'', url:'', kind:'link' }); load(); }
  }
  async function addSocial(e: React.FormEvent) {
    e.preventDefault();
    const row = { person_id: personId, ...socForm };
    const { error } = await supabaseBrowser.from('person_socials').insert([row]);
    if (!error) { setSocForm({ network:'linkedin', handle:'', url:'' }); load(); }
  }
  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    const row = { person_id: personId, ...noteForm };
    const { error } = await supabaseBrowser.from('person_notes').insert([row]);
    if (!error) { setNoteForm({ body:'' }); load(); }
  }
  async function addOrg(e: React.FormEvent) {
    e.preventDefault();
    // upsert org then link
    const { data: org } = await supabaseBrowser.from('orgs').insert([{ name: orgForm.name }]).select('*').single().throwOnError();
    await supabaseBrowser.from('person_orgs').insert([{ person_id: personId, org_id: org.id, role: orgForm.role }]).throwOnError();
    setOrgForm({ name:'', role:'member' }); load();
  }
  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    const { data: proj } = await supabaseBrowser.from('projects').insert([{ name: projForm.name }]).select('*').single().throwOnError();
    await supabaseBrowser.from('person_projects').insert([{ person_id: personId, project_id: proj.id, role: projForm.role }]).throwOnError();
    setProjForm({ name:'', role:'contributor' }); load();
  }

  return (
    <div style={{ display:'grid', gap:16 }}>
      <Card title={person ? `👤 ${person.name}` : 'Person'}>
        {loading && <div style={{opacity:.8}}>Loading…</div>}
        {error && <div style={{color:'#fca5a5'}}>Error: {error}</div>}
        {person && (
          <div style={{display:'grid', gap:6}}>
            <div><b>Email:</b> {person.email ?? '—'}</div>
            <div><b>Role:</b> {person.role ?? '—'}</div>
            <div><b>Position:</b> {person.position ?? '—'}</div>
            <div><b>Category:</b> {person.category ?? '—'}</div>
          </div>
        )}
      </Card>

      {/* Education */}
      <Card title={`🎓 Education (${edu.length})`}>
        <form onSubmit={addEducation} style={{display:'grid', gap:8, gridTemplateColumns:'1fr 1fr 1fr 120px 120px 1fr auto'}}>
          <input placeholder="Level" value={eduForm.level} onChange={e=>setEduForm({...eduForm, level:e.target.value})} />
          <input placeholder="Field" value={eduForm.field} onChange={e=>setEduForm({...eduForm, field:e.target.value})} />
          <input placeholder="Institution" value={eduForm.institution} onChange={e=>setEduForm({...eduForm, institution:e.target.value})} />
          <input placeholder="Start year" value={eduForm.start_year} onChange={e=>setEduForm({...eduForm, start_year:e.target.value})} />
          <input placeholder="End year" value={eduForm.end_year} onChange={e=>setEduForm({...eduForm, end_year:e.target.value})} />
          <input placeholder="Notes" value={eduForm.notes} onChange={e=>setEduForm({...eduForm, notes:e.target.value})} />
          <button type="submit">Add</button>
        </form>
        <div style={{marginTop:8, display:'grid', gap:8}}>
          {edu.map((r:any)=>(<div key={r.id} style={{opacity:.9}}>{r.level} — {r.field} @ {r.institution} ({r.start_year ?? '…'}–{r.end_year ?? '…'})</div>))}
        </div>
      </Card>

      {/* History */}
      <Card title={`🗂️ Background (${hist.length})`}>
        <form onSubmit={addHistory} style={{display:'grid', gap:8, gridTemplateColumns:'1fr 1fr 140px 140px 1fr auto'}}>
          <input placeholder="Title" value={histForm.title} onChange={e=>setHistForm({...histForm, title:e.target.value})} />
          <input placeholder="Org" value={histForm.org} onChange={e=>setHistForm({...histForm, org:e.target.value})} />
          <input placeholder="Start date (YYYY-MM-DD)" value={histForm.start_date} onChange={e=>setHistForm({...histForm, start_date:e.target.value})} />
          <input placeholder="End date (YYYY-MM-DD)" value={histForm.end_date} onChange={e=>setHistForm({...histForm, end_date:e.target.value})} />
          <input placeholder="Description" value={histForm.description} onChange={e=>setHistForm({...histForm, description:e.target.value})} />
          <button type="submit">Add</button>
        </form>
        <div style={{marginTop:8, display:'grid', gap:8}}>
          {hist.map((r:any)=>(<div key={r.id} style={{opacity:.9}}>{r.title} @ {r.org} ({r.start_date ?? '…'}–{r.end_date ?? '…'}) — {r.description}</div>))}
        </div>
      </Card>

      {/* Links */}
      <Card title={`🔗 Links (${links.length})`}>
        <form onSubmit={addLink} style={{display:'grid', gap:8, gridTemplateColumns:'1fr 1fr 1fr auto'}}>
          <input placeholder="Label" value={linkForm.label} onChange={e=>setLinkForm({...linkForm, label:e.target.value})} />
          <input placeholder="URL" value={linkForm.url} onChange={e=>setLinkForm({...linkForm, url:e.target.value})} />
          <input placeholder="Kind (news/article/portfolio/other)" value={linkForm.kind} onChange={e=>setLinkForm({...linkForm, kind:e.target.value})} />
          <button type="submit">Add</button>
        </form>
        <div style={{marginTop:8, display:'grid', gap:8}}>
          {links.map((r:any)=>(<div key={r.id}><a href={r.url} target="_blank" style={{textDecoration:'underline'}}>{r.label || r.url}</a> <span style={{opacity:.6}}>({r.kind})</span></div>))}
        </div>
      </Card>

      {/* Socials */}
      <Card title={`🌐 Socials (${socials.length})`}>
        <form onSubmit={addSocial} style={{display:'grid', gap:8, gridTemplateColumns:'1fr 1fr 1fr auto'}}>
          <input placeholder="Network (twitter/linkedin/...)" value={socForm.network} onChange={e=>setSocForm({...socForm, network:e.target.value})} />
          <input placeholder="Handle" value={socForm.handle} onChange={e=>setSocForm({...socForm, handle:e.target.value})} />
          <input placeholder="URL" value={socForm.url} onChange={e=>setSocForm({...socForm, url:e.target.value})} />
          <button type="submit">Add</button>
        </form>
        <div style={{marginTop:8, display:'grid', gap:8}}>
          {socials.map((r:any)=>(<div key={r.id}>{r.network}: {r.handle} — <a href={r.url} target="_blank" style={{textDecoration:'underline'}}>{r.url}</a></div>))}
        </div>
      </Card>

      {/* Notes */}
      <Card title={`📝 Notes (${notes.length})`}>
        <form onSubmit={addNote} style={{display:'grid', gap:8, gridTemplateColumns:'1fr auto'}}>
          <input placeholder="Write a note…" value={noteForm.body} onChange={e=>setNoteForm({...noteForm, body:e.target.value})} />
          <button type="submit">Add</button>
        </form>
        <div style={{marginTop:8, display:'grid', gap:8}}>
          {notes.map((r:any)=>(<div key={r.id} style={{opacity:.9}}>{r.body}</div>))}
        </div>
      </Card>

      {/* Memberships */}
      <Card title={`🏛️ Orgs (${pOrgs.length})`}>
        <form onSubmit={addOrg} style={{display:'grid', gap:8, gridTemplateColumns:'1fr 160px auto'}}>
          <input placeholder="Org name" value={orgForm.name} onChange={e=>setOrgForm({...orgForm, name:e.target.value})} />
          <input placeholder="Role (member/admin/...)" value={orgForm.role} onChange={e=>setOrgForm({...orgForm, role:e.target.value})} />
          <button type="submit">Add</button>
        </form>
        <div style={{marginTop:8, display:'grid', gap:8}}>
          {pOrgs.map((r:any)=>(<div key={r.id}>{r.orgs?.name ?? r.org_id} <span style={{opacity:.6}}>({r.role})</span></div>))}
        </div>
      </Card>

      <Card title={`📦 Projects (${pProjs.length})`}>
        <form onSubmit={addProject} style={{display:'grid', gap:8, gridTemplateColumns:'1fr 160px auto'}}>
          <input placeholder="Project name" value={projForm.name} onChange={e=>setProjForm({...projForm, name:e.target.value})} />
          <input placeholder="Role" value={projForm.role} onChange={e=>setProjForm({...projForm, role:e.target.value})} />
          <button type="submit">Add</button>
        </form>
        <div style={{marginTop:8, display:'grid', gap:8}}>
          {pProjs.map((r:any)=>(<div key={r.id}>{r.projects?.name ?? r.project_id} <span style={{opacity:.6}}>({r.role})</span></div>))}
        </div>
      </Card>

      <Card title={`🏅 Grades (${grades.length})`}>
        <div style={{opacity:.8}}>Grading UI comes next; you can insert via SQL now (table: <code>person_grades</code>).</div>
      </Card>
    </div>
  );
}
