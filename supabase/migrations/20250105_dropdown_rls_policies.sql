-- 20250105_dropdown_rls_policies.sql
-- Enable RLS and add public read policies for dropdown tables

-- 1) Enable RLS on dropdown tables
alter table "Occupation" enable row level security;
alter table "Skill" enable row level security;
alter table "Passion" enable row level security;
alter table "Compassion" enable row level security;
alter table "Vision" enable row level security;

-- 2) Add public read policies for dropdowns (anon & authenticated)
do $$
begin
  -- Occupation
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Occupation'
      and policyname = 'read_occupation_public'
  ) then
    create policy read_occupation_public
      on "Occupation" for select
      to anon, authenticated
      using (true);
  end if;

  -- Skill
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Skill'
      and policyname = 'read_skill_public'
  ) then
    create policy read_skill_public
      on "Skill" for select
      to anon, authenticated
      using (true);
  end if;

  -- Passion
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Passion'
      and policyname = 'read_passion_public'
  ) then
    create policy read_passion_public
      on "Passion" for select
      to anon, authenticated
      using (true);
  end if;

  -- Compassion
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Compassion'
      and policyname = 'read_compassion_public'
  ) then
    create policy read_compassion_public
      on "Compassion" for select
      to anon, authenticated
      using (true);
  end if;

  -- Vision
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Vision'
      and policyname = 'read_vision_public'
  ) then
    create policy read_vision_public
      on "Vision" for select
      to anon, authenticated
      using (true);
  end if;
end
$$;
