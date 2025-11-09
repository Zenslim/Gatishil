-- Gatishil HR Upgrade (idempotent)
create extension if not exists pgcrypto;

-- Base People table already exists; ensure needed generic fields
alter table public.people add column if not exists position text; -- Position
alter table public.people add column if not exists category text check (category in (
  'administrative','paying_member','non_paying_member','volunteer','affiliated_professional','non_affiliated_professional','person_of_interest'
)) default 'volunteer';
alter table public.people add column if not exists emergency_contact jsonb; -- {name, phone, relation}
alter table public.people add column if not exists fees jsonb; -- for members: {subscription_plan, due_until, last_paid_at, amount}
alter table public.people add column if not exists compensation jsonb; -- for affiliated professionals: {rate, currency, terms}

-- Education
create table if not exists public.person_education (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  level text, -- e.g., Bachelor, Master
  field text,
  institution text,
  start_year int,
  end_year int,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_person_education_person on public.person_education(person_id);

-- Background / History (work or life history)
create table if not exists public.person_history (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  title text,
  org text,
  start_date date,
  end_date date,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists idx_person_history_person on public.person_history(person_id);

-- Profile management (attachments/links)
create table if not exists public.person_links (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  label text,
  url text,
  kind text, -- news | article | portfolio | other
  created_at timestamptz not null default now()
);
create index if not exists idx_person_links_person on public.person_links(person_id);

-- Affiliated organizations / groups
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text default 'coop',
  description text,
  created_at timestamptz not null default now()
);
create table if not exists public.person_orgs (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  role text, -- member | admin | advisor etc.
  since date,
  until date,
  created_at timestamptz not null default now(),
  unique (person_id, org_id)
);
create index if not exists idx_person_orgs_person on public.person_orgs(person_id);

-- Family relationships
DO $$
BEGIN
    -- This IF statement is now valid because it's inside a DO block
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relation_kind') THEN
        CREATE TYPE relation_kind AS ENUM ('parent', 'child', 'spouse', 'sibling', 'relative', 'guardian', 'other');
    END IF;
END$$;
create table if not exists public.person_family (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  relative_id uuid not null references public.people(id) on delete cascade,
  kind relation_kind not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (person_id, relative_id, kind)
);
create index if not exists idx_person_family_person on public.person_family(person_id);

-- Circles (lightweight groups)
create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create table if not exists public.circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role text, -- coordinator | member
  created_at timestamptz not null default now(),
  unique (circle_id, person_id)
);
create index if not exists idx_circle_members_person on public.circle_members(person_id);

-- Social media accounts
create table if not exists public.person_socials (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  network text, -- twitter | facebook | linkedin | instagram | github | youtube | other
  handle text,
  url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_person_socials_person on public.person_socials(person_id);

-- Unstructured info + notes (people already has notes text; add a long text store)
create table if not exists public.person_notes (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists idx_person_notes_person on public.person_notes(person_id);

-- Grading system (overall, project-wise, third party)
create table if not exists public.person_grades (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  source text not null, -- overall | project:<id> | third_party:<name>
  score numeric check (score >= 0 and score <= 100),
  rubric jsonb, -- {teamwork:80, delivery:90, ...}
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_person_grades_person on public.person_grades(person_id);

-- Projects involved in (join)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text default 'active',
  created_at timestamptz not null default now()
);
create table if not exists public.person_projects (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  role text,
  since date,
  until date,
  created_at timestamptz not null default now(),
  unique (person_id, project_id)
);
create index if not exists idx_person_projects_person on public.person_projects(person_id);

-- Vetting: templates + responses
create table if not exists public.vetting_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  criteria jsonb not null, -- e.g., {min_edu:'Bachelors', must_fields:['history','references']}
  created_at timestamptz not null default now()
);
create table if not exists public.vettings (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.vetting_templates(id) on delete set null,
  person_id uuid not null references public.people(id) on delete cascade,
  status text default 'pending', -- pending | passed | rejected
  result jsonb, -- {score:85, reasons:[...]}
  created_at timestamptz not null default now()
);
create index if not exists idx_vettings_person on public.vettings(person_id);

-- Unique index for emails to avoid duplicates (optional but recommended)
create unique index if not exists idx_people_email_unique on public.people (lower(email)) where email is not null;

-- RLS: open read, auth write (match existing policy style)
alter table public.person_education enable row level security;
alter table public.person_history enable row level security;
alter table public.person_links enable row level security;
alter table public.person_orgs enable row level security;
alter table public.person_family enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.person_socials enable row level security;
alter table public.person_notes enable row level security;
alter table public.person_grades enable row level security;
alter table public.person_projects enable row level security;
alter table public.vetting_templates enable row level security;
alter table public.vettings enable row level security;

do $$
begin
  -- helper to create simple read/write policies
  perform 1;
  -- person_education
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_education' and policyname='person_education_select') then
    create policy person_education_select on public.person_education for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_education' and policyname='person_education_write') then
    create policy person_education_write on public.person_education for all to authenticated using (true) with check (true);
  end if;

  -- person_history
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_history' and policyname='person_history_select') then
    create policy person_history_select on public.person_history for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_history' and policyname='person_history_write') then
    create policy person_history_write on public.person_history for all to authenticated using (true) with check (true);
  end if;

  -- person_links
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_links' and policyname='person_links_select') then
    create policy person_links_select on public.person_links for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_links' and policyname='person_links_write') then
    create policy person_links_write on public.person_links for all to authenticated using (true) with check (true);
  end if;

  -- person_orgs
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_orgs' and policyname='person_orgs_select') then
    create policy person_orgs_select on public.person_orgs for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_orgs' and policyname='person_orgs_write') then
    create policy person_orgs_write on public.person_orgs for all to authenticated using (true) with check (true);
  end if;

  -- person_family
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_family' and policyname='person_family_select') then
    create policy person_family_select on public.person_family for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_family' and policyname='person_family_write') then
    create policy person_family_write on public.person_family for all to authenticated using (true) with check (true);
  end if;

  -- circles
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='circles' and policyname='circles_select') then
    create policy circles_select on public.circles for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='circles' and policyname='circles_write') then
    create policy circles_write on public.circles for all to authenticated using (true) with check (true);
  end if;

  -- circle_members
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='circle_members' and policyname='circle_members_select') then
    create policy circle_members_select on public.circle_members for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='circle_members' and policyname='circle_members_write') then
    create policy circle_members_write on public.circle_members for all to authenticated using (true) with check (true);
  end if;

  -- person_socials
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_socials' and policyname='person_socials_select') then
    create policy person_socials_select on public.person_socials for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_socials' and policyname='person_socials_write') then
    create policy person_socials_write on public.person_socials for all to authenticated using (true) with check (true);
  end if;

  -- person_notes
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_notes' and policyname='person_notes_select') then
    create policy person_notes_select on public.person_notes for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_notes' and policyname='person_notes_write') then
    create policy person_notes_write on public.person_notes for all to authenticated using (true) with check (true);
  end if;

  -- person_grades
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_grades' and policyname='person_grades_select') then
    create policy person_grades_select on public.person_grades for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_grades' and policyname='person_grades_write') then
    create policy person_grades_write on public.person_grades for all to authenticated using (true) with check (true);
  end if;

  -- person_projects
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_projects' and policyname='person_projects_select') then
    create policy person_projects_select on public.person_projects for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='person_projects' and policyname='person_projects_write') then
    create policy person_projects_write on public.person_projects for all to authenticated using (true) with check (true);
  end if;

  -- vetting_templates
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='vetting_templates' and policyname='vetting_templates_select') then
    create policy vetting_templates_select on public.vetting_templates for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='vetting_templates' and policyname='vetting_templates_write') then
    create policy vetting_templates_write on public.vetting_templates for all to authenticated using (true) with check (true);
  end if;

  -- vettings
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='vettings' and policyname='vettings_select') then
    create policy vettings_select on public.vettings for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='vettings' and policyname='vettings_write') then
    create policy vettings_write on public.vettings for all to authenticated using (true) with check (true);
  end if;
end$$;

-- Seed one vetting template if none
insert into public.vetting_templates (name, description, criteria)
select 'Admin Staff Baseline', 'Basic checks for administrative staff', jsonb_build_object('min_edu','Bachelor','must_fields',array['person_history','person_education'])
where not exists (select 1 from public.vetting_templates);
