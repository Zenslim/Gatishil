
-- 0001_init_corrected.sql
-- One Ledger, Six Registers (+ DAO) — Supabase/Postgres schema (CORRECTED)
-- This version removes the invalid UNIQUE constraint that used an expression
-- and replaces it with proper UNIQUE INDEXes on poll_votes.

-- ===============================
-- Extensions
-- ===============================
create extension if not exists pgcrypto;      -- gen_random_uuid
create extension if not exists pg_trgm;       -- trigram search
create extension if not exists "uuid-ossp";   -- uuid_generate_v4

-- ===============================
-- Helper functions (Supabase)
-- ===============================
create or replace function auth_role() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb->>'role',''),
    'user'
  );
$$;

create or replace function auth_uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid;
$$;

-- Admin check
create or replace function is_admin() returns boolean
language sql stable as $$
  select auth_role() = 'admin';
$$;

-- ===============================
-- Enums
-- ===============================
do $$ begin
  create type project_status as enum ('idea','active','paused','done','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type money_type as enum ('donation','fee','expense','transfer','grant','income','refund');
exception when duplicate_object then null; end $$;

do $$ begin
  create type money_direction as enum ('in','out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proposal_status as enum ('draft','active','passed','rejected','withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vote_choice as enum ('yes','no','abstain');
exception when duplicate_object then null; end $$;

-- ===============================
-- SIX REGISTERS
-- ===============================

-- PEOPLE
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  name text not null,
  email text unique,
  phone text,
  tags text[] default '{}'::text[],
  grade int,
  notes text,
  status text default 'active',
  metadata jsonb default '{}'::jsonb
);
create index if not exists idx_people_name on public.people using gin (to_tsvector('simple', coalesce(name,'')));
create index if not exists idx_people_tags on public.people using gin (tags);

create table if not exists public.people_relationships (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  related_person_id uuid not null references public.people(id) on delete cascade,
  relation_type text not null,
  notes text,
  unique(person_id, related_person_id, relation_type)
);

-- ORGS
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  name text not null,
  org_type text,
  areas_of_work text[] default '{}'::text[],
  website text,
  socials jsonb default '{}'::jsonb,
  address text,
  tags text[] default '{}'::text[],
  metadata jsonb default '{}'::jsonb
);
create index if not exists idx_orgs_name on public.orgs using gin (to_tsvector('simple', coalesce(name,'')));
create index if not exists idx_orgs_tags on public.orgs using gin (tags);

create table if not exists public.people_orgs (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  role text,
  start_date date,
  end_date date,
  unique(person_id, org_id, role)
);

-- PROJECTS
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  status project_status not null default 'idea',
  budget numeric(14,2) default 0,
  org_id uuid references public.orgs(id) on delete set null,
  location jsonb,
  tags text[] default '{}'::text[],
  metadata jsonb default '{}'::jsonb
);
create index if not exists idx_projects_title on public.projects using gin (to_tsvector('simple', coalesce(title,'')));
create index if not exists idx_projects_tags on public.projects using gin (tags);

create table if not exists public.people_projects (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  role text,
  unique(person_id, project_id, role)
);

-- MONEY (cashbook)
create table if not exists public.treasury_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  org_id uuid references public.orgs(id) on delete set null,
  currency text not null default 'NPR',
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.money_ledger (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  account_id uuid not null references public.treasury_accounts(id) on delete restrict,
  direction money_direction not null,
  type money_type not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'NPR',
  project_id uuid references public.projects(id) on delete set null,
  org_id uuid references public.orgs(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  memo text,
  metadata jsonb default '{}'::jsonb
);
create index if not exists idx_money_ts on public.money_ledger(ts);
create index if not exists idx_money_project on public.money_ledger(project_id);
create index if not exists idx_money_org on public.money_ledger(org_id);
create index if not exists idx_money_person on public.money_ledger(person_id);

-- KNOWLEDGE
create table if not exists public.knowledge_folders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  parent_id uuid references public.knowledge_folders(id) on delete cascade
);

create table if not exists public.knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  title text not null,
  slug text unique,
  folder_id uuid references public.knowledge_folders(id) on delete set null,
  body text,
  url text,
  doc_type text,
  visibility text default 'internal', -- 'public' | 'internal' | 'private'
  tags text[] default '{}'::text[],
  metadata jsonb default '{}'::jsonb
);
create index if not exists idx_kdocs_title on public.knowledge_docs using gin (to_tsvector('simple', coalesce(title,'')));
create index if not exists idx_kdocs_tags on public.knowledge_docs using gin (tags);

-- POLLS
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  body text,
  starts_at timestamptz default now(),
  ends_at timestamptz,
  allow_multiple boolean default false,
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  position int not null default 0
);
create index if not exists idx_poll_options_poll on public.poll_options(poll_id);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid references public.poll_options(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  rank int,
  created_at timestamptz not null default now()
);
create index if not exists idx_poll_votes_poll on public.poll_votes(poll_id);

-- Replace broken uniqueness with proper unique indexes:
-- 1) For rows where option_id IS NULL: at most one vote per (poll_id, voter_id)
create unique index if not exists ux_poll_votes_null_option_singleton
  on public.poll_votes (poll_id, voter_id)
  where option_id is null;

-- 2) For rows where option_id IS NOT NULL: one vote per (poll_id, voter_id, option_id)
create unique index if not exists ux_poll_votes_per_option
  on public.poll_votes (poll_id, voter_id, option_id)
  where option_id is not null;

-- TAGGING
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  label text not null unique
);

create table if not exists public.tag_links (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tags(id) on delete cascade,
  target_table text not null,
  target_id uuid not null,
  unique(tag_id, target_table, target_id)
);

-- ===============================
-- DAO LAYER
-- ===============================
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text,
  email text,
  phone text,
  is_active boolean default true,
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.member_roles (
  member_id uuid not null references public.members(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (member_id, role_id)
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  body text,
  status proposal_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.proposal_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  choice vote_choice not null,
  weight numeric(12,4) default 1,
  created_at timestamptz not null default now(),
  unique (proposal_id, voter_id)
);

-- ===============================
-- Triggers (updated_at)
-- ===============================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ begin
  create trigger set_projects_updated_at
  before update on public.projects
  for each row execute procedure set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger set_kdocs_updated_at
  before update on public.knowledge_docs
  for each row execute procedure set_updated_at();
exception when duplicate_object then null; end $$;

-- ===============================
-- RLS
-- ===============================
alter table public.people enable row level security;
alter table public.people_relationships enable row level security;
alter table public.orgs enable row level security;
alter table public.people_orgs enable row level security;
alter table public.projects enable row level security;
alter table public.people_projects enable row level security;
alter table public.treasury_accounts enable row level security;
alter table public.money_ledger enable row level security;
alter table public.knowledge_folders enable row level security;
alter table public.knowledge_docs enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.tags enable row level security;
alter table public.tag_links enable row level security;
alter table public.members enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.member_roles enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_votes enable row level security;

-- Policies (drop-create idempotent)
-- PEOPLE
drop policy if exists people_admin_all on public.people;
create policy people_admin_all on public.people using (is_admin()) with check (is_admin());
drop policy if exists people_read_all on public.people;
create policy people_read_all on public.people for select using (true);
drop policy if exists people_write_own on public.people;
create policy people_write_own on public.people for insert with check (auth_uid() = created_by or is_admin());
drop policy if exists people_update_own on public.people;
create policy people_update_own on public.people for update using (auth_uid() = created_by or is_admin()) with check (auth_uid() = created_by or is_admin());

-- ORGS
drop policy if exists orgs_admin_all on public.orgs;
create policy orgs_admin_all on public.orgs using (is_admin()) with check (is_admin());
drop policy if exists orgs_read_all on public.orgs;
create policy orgs_read_all on public.orgs for select using (true);
drop policy if exists orgs_write_own on public.orgs;
create policy orgs_write_own on public.orgs for insert with check (auth_uid() = created_by or is_admin());
drop policy if exists orgs_update_own on public.orgs;
create policy orgs_update_own on public.orgs for update using (auth_uid() = created_by or is_admin()) with check (auth_uid() = created_by or is_admin());

-- PROJECTS
drop policy if exists projects_admin_all on public.projects;
create policy projects_admin_all on public.projects using (is_admin()) with check (is_admin());
drop policy if exists projects_read_all on public.projects;
create policy projects_read_all on public.projects for select using (true);
drop policy if exists projects_write_own on public.projects;
create policy projects_write_own on public.projects for insert with check (auth_uid() = created_by or is_admin());
drop policy if exists projects_update_own on public.projects;
create policy projects_update_own on public.projects for update using (auth_uid() = created_by or is_admin()) with check (auth_uid() = created_by or is_admin());

-- TREASURY ACCOUNTS
drop policy if exists ta_admin_all on public.treasury_accounts;
create policy ta_admin_all on public.treasury_accounts using (is_admin()) with check (is_admin());
drop policy if exists ta_read_all on public.treasury_accounts;
create policy ta_read_all on public.treasury_accounts for select using (true);
drop policy if exists ta_write_admin on public.treasury_accounts;
create policy ta_write_admin on public.treasury_accounts for all using (is_admin()) with check (is_admin());

-- MONEY LEDGER
drop policy if exists ml_admin_all on public.money_ledger;
create policy ml_admin_all on public.money_ledger using (is_admin()) with check (is_admin());
drop policy if exists ml_read_all on public.money_ledger;
create policy ml_read_all on public.money_ledger for select using (true);
drop policy if exists ml_write_own on public.money_ledger;
create policy ml_write_own on public.money_ledger for insert with check (auth_uid() = created_by or is_admin());
drop policy if exists ml_update_own on public.money_ledger;
create policy ml_update_own on public.money_ledger for update using (auth_uid() = created_by or is_admin()) with check (auth_uid() = created_by or is_admin());

-- KNOWLEDGE
drop policy if exists kf_admin_all on public.knowledge_folders;
create policy kf_admin_all on public.knowledge_folders using (is_admin()) with check (is_admin());
drop policy if exists kd_admin_all on public.knowledge_docs;
create policy kd_admin_all on public.knowledge_docs using (is_admin()) with check (is_admin());
drop policy if exists kf_read_all on public.knowledge_folders;
create policy kf_read_all on public.knowledge_folders for select using (true);
drop policy if exists kd_read_public_internal on public.knowledge_docs;
create policy kd_read_public_internal on public.knowledge_docs for select using (visibility in ('public','internal') or is_admin());
drop policy if exists kd_write_own on public.knowledge_docs;
create policy kd_write_own on public.knowledge_docs for insert with check (auth_uid() = created_by or is_admin());
drop policy if exists kd_update_own on public.knowledge_docs;
create policy kd_update_own on public.knowledge_docs for update using (auth_uid() = created_by or is_admin()) with check (auth_uid() = created_by or is_admin());

-- POLLS
drop policy if exists polls_admin_all on public.polls;
create policy polls_admin_all on public.polls using (is_admin()) with check (is_admin());
drop policy if exists polls_read_all on public.polls;
create policy polls_read_all on public.polls for select using (true);
drop policy if exists polls_write_own on public.polls;
create policy polls_write_own on public.polls for insert with check (auth_uid() = created_by or is_admin());
drop policy if exists polls_update_own on public.polls;
create policy polls_update_own on public.polls for update using (auth_uid() = created_by or is_admin()) with check (auth_uid() = created_by or is_admin());

drop policy if exists po_admin_all on public.poll_options;
create policy po_admin_all on public.poll_options using (is_admin()) with check (is_admin());
drop policy if exists po_read_all on public.poll_options;
create policy po_read_all on public.poll_options for select using (true);

drop policy if exists pv_admin_all on public.poll_votes;
create policy pv_admin_all on public.poll_votes using (is_admin()) with check (is_admin());
drop policy if exists pv_vote_once on public.poll_votes;
create policy pv_vote_once on public.poll_votes for insert with check (auth_uid() is not null);
drop policy if exists pv_read_own on public.poll_votes;
create policy pv_read_own on public.poll_votes for select using (auth_uid() = voter_id or is_admin());

-- TAGS
drop policy if exists tags_read_all on public.tags;
create policy tags_read_all on public.tags for select using (true);
drop policy if exists tags_admin_all on public.tags;
create policy tags_admin_all on public.tags using (is_admin()) with check (is_admin());

drop policy if exists taglinks_read_all on public.tag_links;
create policy taglinks_read_all on public.tag_links for select using (true);
drop policy if exists taglinks_admin_all on public.tag_links;
create policy taglinks_admin_all on public.tag_links using (is_admin()) with check (is_admin());
