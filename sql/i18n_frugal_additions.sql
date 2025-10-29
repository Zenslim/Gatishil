-- =========================================================
-- Unified Nepali ↔ English Localization (Frugal Mode)
-- Adds missing tables beyond i18n_cache:
--   1) i18n_missing       – logs missing NP UI keys
--   2) i18n_overrides     – approved NP UI translations
--   3) content            – long-form (blogs/faq/manifesto/prd)
--   4) content_missing    – tracks untranslated long-form
-- RLS included. Safe for anon reads; writes via SERVICE_ROLE only.
-- =========================================================

-- 1) UI: missing NP keys (logged by /api/i18n/missing)
create table if not exists public.i18n_missing (
  key        text not null,
  en_text    text not null,
  en_hash    text not null, -- sha256 short for dedupe when English wording changes
  context    text,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  seen_count int not null default 1,
  primary key (key, en_hash)
);

-- bump last_seen / seen_count on upsert
create or replace function public.i18n_missing_bump()
returns trigger as $$
begin
  new.last_seen := now();
  new.seen_count := coalesce(old.seen_count,0) + 1;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_i18n_missing_bump on public.i18n_missing;
create trigger trg_i18n_missing_bump
before update on public.i18n_missing
for each row execute procedure public.i18n_missing_bump();

-- convenience view: prioritize most frequently seen misses first
create or replace view public.v_i18n_missing_priority as
select key, en_text, en_hash, context, first_seen, last_seen, seen_count
from public.i18n_missing
order by seen_count desc, last_seen desc;

-- 2) UI: approved NP overrides used at runtime by the app
create table if not exists public.i18n_overrides (
  key        text primary key,
  np_text    text not null,
  updated_at timestamptz not null default now()
);

-- 3) CONTENT: long-form items (blogs, faq, manifesto, prd)
create table if not exists public.content (
  slug       text primary key,                          -- e.g. 'manifesto', 'parallel-life'
  category   text,                                      -- 'manifesto' | 'blog' | 'faq' | 'prd'
  title_en   text,
  title_np   text,
  body_en    text,                                      -- markdown or html
  body_np    text,                                      -- markdown or html
  author     text,
  tags       text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  missing_np boolean not null default false
);

create index if not exists idx_content_category on public.content (category);
create index if not exists idx_content_missing_np on public.content (missing_np);

-- keep missing_np in sync
create or replace function public.content_missing_flag()
returns trigger as $$
begin
  new.missing_np := (new.body_np is null or length(coalesce(new.body_np, '')) = 0);
  new.updated_at := now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_content_missing_flag on public.content;
create trigger trg_content_missing_flag
before insert or update on public.content
for each row execute procedure public.content_missing_flag();

-- 4) CONTENT: log untranslated slugs for editor queue (optional but handy)
create table if not exists public.content_missing (
  slug      text primary key,
  title_en  text,
  logged_at timestamptz not null default now(),
  notified  boolean not null default false
);

-- convenience view: list items still needing NP (from content)
create or replace view public.v_content_needs_np as
select slug, category, title_en, created_at, updated_at
from public.content
where missing_np = true;

-- =========================================================
-- RLS (read-only for anon; writes via SERVICE_ROLE)
-- =========================================================
alter table public.i18n_missing enable row level security;
alter table public.i18n_overrides enable row level security;
alter table public.content enable row level security;
alter table public.content_missing enable row level security;

-- READ policies
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='i18n_missing' and policyname='read_i18n_missing'
  ) then
    create policy read_i18n_missing on public.i18n_missing for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='i18n_overrides' and policyname='read_i18n_overrides'
  ) then
    create policy read_i18n_overrides on public.i18n_overrides for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='content' and policyname='read_content'
  ) then
    create policy read_content on public.content for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='content_missing' and policyname='read_content_missing'
  ) then
    create policy read_content_missing on public.content_missing for select to anon using (true);
  end if;
end $$;

-- NO client writes; only service role (API routes) should upsert
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='i18n_missing' and policyname='deny_write_i18n_missing'
  ) then
    create policy deny_write_i18n_missing on public.i18n_missing for all to anon using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='i18n_overrides' and policyname='deny_write_i18n_overrides'
  ) then
    create policy deny_write_i18n_overrides on public.i18n_overrides for all to anon using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='content' and policyname='deny_write_content'
  ) then
    create policy deny_write_content on public.content for all to anon using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='content_missing' and policyname='deny_write_content_missing'
  ) then
    create policy deny_write_content_missing on public.content_missing for all to anon using (false) with check (false);
  end if;
end $$;

-- =========================================================
-- Sanity seeds (optional): create starter content rows
-- =========================================================
insert into public.content (slug, category, title_en, body_en)
values
  ('manifesto', 'manifesto', 'Gatishil Loktantric Party', '## Manifesto (EN)\nPaste your English manifesto here.'),
  ('parallel-life', 'manifesto', 'The Manifesto of Parallel Life', '## Parallel Life (EN)\nPaste the English text here.')
on conflict (slug) do nothing;
