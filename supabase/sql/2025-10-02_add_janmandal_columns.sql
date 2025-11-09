-- Add Janmandal columns if missing
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='hands') then
    alter table public.profiles add column hands text[] default '{}'::text[];
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='gifts') then
    alter table public.profiles add column gifts text[] default '{}'::text[];
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='fire') then
    alter table public.profiles add column fire text[] default '{}'::text[];
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='heart') then
    alter table public.profiles add column heart text[] default '{}'::text[];
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='journey') then
    alter table public.profiles add column journey text check (journey in ('rooted','branching','sapling','searching'));
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='vision') then
    alter table public.profiles add column vision text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='updated_at') then
    alter table public.profiles add column updated_at timestamptz default now();
  end if;
end $$;
