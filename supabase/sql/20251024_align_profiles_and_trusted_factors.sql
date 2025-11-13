-- 20251024_align_profiles_and_trusted_factors.sql
-- Single source of truth for aligning app expectations with Supabase schema.
-- Safe-reentrant: uses IF EXISTS/IF NOT EXISTS and additive columns.
-- Run in Supabase SQL Editor on project: ulzezxlwitxwgmxurnep

begin;

-- 1) PROFILES: rename primary key and add columns the app writes/reads
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='user_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='id'
  ) then
    execute 'alter table public.profiles rename column user_id to id';
  end if;
end$$;

alter table public.profiles
  add column if not exists name text,
  add column if not exists surname text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists photo_url text,
  add column if not exists occupation text,
  add column if not exists skill text[],
  add column if not exists passion text[],
  add column if not exists compassion text[],
  add column if not exists vision text,
  add column if not exists passkey_enabled boolean default false,
  add column if not exists passkey_cred_ids text[];

-- Ensure PK exists on id (covers both fresh and legacy states)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'p'
  ) then
    execute 'alter table public.profiles add primary key (id)';
  end if;
end$$;

-- 2) TRUSTED FACTORS: store PIN hashes securely, one row per auth_user_id+factor
create table if not exists public.trusted_factors (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  factor_type text not null default 'pin',
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  constraint trusted_factors_pk primary key (auth_user_id, factor_type)
);

alter table public.trusted_factors enable row level security;

-- Owner-only access (the app usually reads/writes with the authenticated user;
-- PIN login uses admin service client to read by user id)
drop policy if exists user_owns_pin on public.trusted_factors;
create policy user_owns_pin
  on public.trusted_factors
  for all
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

commit;
