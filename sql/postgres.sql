-- Safe extensions
create extension if not exists pgcrypto;

-- Ensure table exists (minimal shape)
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

-- Add any missing columns (idempotent)
alter table public.people add column if not exists role text;
alter table public.people add column if not exists email text;
alter table public.people add column if not exists created_at timestamptz not null default now();

-- Index (idempotent)
create index if not exists idx_people_created_at
  on public.people (created_at desc);

-- Enable RLS
alter table public.people enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='people' and policyname='people_select_all'
  ) then
    create policy people_select_all
      on public.people
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='people' and policyname='people_insert_auth'
  ) then
    create policy people_insert_auth
      on public.people
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='people' and policyname='people_update_auth'
  ) then
    create policy people_update_auth
      on public.people
      for update
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='people' and policyname='people_delete_auth'
  ) then
    create policy people_delete_auth
      on public.people
      for delete
      to authenticated
      using (true);
  end if;
end$$;

-- Seed if empty (now that columns exist)
insert into public.people (name, role, email)
select 'First Citizen', 'Coordinator', 'first@example.com'
where not exists (select 1 from public.people);
