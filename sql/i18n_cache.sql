-- sql/i18n_cache.sql
create table if not exists public.i18n_cache (
  key text not null,
  lang text not null default 'np',
  hash text not null,
  source_text text not null,
  translated_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key, lang, hash)
);

-- Optional RLS (read for all, write only server role)
alter table public.i18n_cache enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'i18n_cache' and policyname = 'read_all') then
    create policy read_all on public.i18n_cache for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'i18n_cache' and policyname = 'no_write_client') then
    create policy no_write_client on public.i18n_cache for all to anon using (false) with check (false);
  end if;
end $$;
