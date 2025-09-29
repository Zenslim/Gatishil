-- Gatishil • Digital Chauṭarī Locations Schema
-- One-time setup for a user-friendly, searchable location database:
-- - Nepal: Province → District → Local Level (753) → Ward (6,743) → (optional) Tole
-- - Diaspora: Country → City
-- - Unified SEARCH endpoint (function) + one flat PICKER view for your dropdown
-- - Fast: unaccent + trigram + tsvector indices
-- - Safe: RLS = anon read-only, write only with service role

-------------------------
-- 0) Extensions
-------------------------
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-------------------------
-- 1) Schema
-------------------------
create schema if not exists geo;

-------------------------
-- 2) Nepal Core Tables
-------------------------
-- Provinces (7)
create table if not exists geo.provinces (
  id smallint primary key,               -- 1..7
  name_en text not null,
  name_ne text,
  created_at timestamptz default now()
);

-- Districts (77)
create table if not exists geo.districts (
  id smallint primary key,               -- stable numeric id
  province_id smallint not null references geo.provinces(id) on update cascade on delete restrict,
  name_en text not null,
  name_ne text,
  created_at timestamptz default now()
);

-- Local Levels (753): types (Metropolitan, Sub-Metropolitan, Municipality, Rural Municipality)
create type if not exists geo.local_level_type as enum ('Metropolitan City','Sub-Metropolitan City','Municipality','Rural Municipality');

create table if not exists geo.local_levels (
  id integer primary key,                -- official code if available; else generated
  district_id smallint not null references geo.districts(id) on update cascade on delete restrict,
  ll_type geo.local_level_type not null,
  name_en text not null,
  name_ne text,
  ll_code text,                          -- official code if different from id
  center_lat numeric(10,7),              -- optional
  center_lng numeric(10,7),              -- optional
  created_at timestamptz default now()
);

-- Wards (6743)
create table if not exists geo.wards (
  id bigserial primary key,              -- internal id
  local_level_id integer not null references geo.local_levels(id) on update cascade on delete cascade,
  ward_no smallint not null check (ward_no >= 1 and ward_no <= 40),
  center_lat numeric(10,7),
  center_lng numeric(10,7),
  created_at timestamptz default now(),
  unique(local_level_id, ward_no)
);

-- Optional Toles/Addresses (freeform, crowd-expandable later)
create table if not exists geo.toles (
  id bigserial primary key,
  ward_id bigint not null references geo.wards(id) on update cascade on delete cascade,
  name_en text not null,
  alt_names text[],                      -- other spellings/names
  lat numeric(10,7),
  lng numeric(10,7),
  created_at timestamptz default now()
);

-------------------------
-- 3) Diaspora Tables
-------------------------
-- Countries (ISO-3166-1 alpha2 code as id)
create table if not exists geo.countries (
  id char(2) primary key, -- 'NP','US','GB',...
  name_en text not null,
  name_native text
);

-- Cities (lightweight, add more as needed)
create table if not exists geo.cities (
  id bigserial primary key,
  country_id char(2) not null references geo.countries(id) on update cascade on delete cascade,
  name_en text not null,
  admin1 text,            -- state/province name (optional)
  lat numeric(10,7),
  lng numeric(10,7)
);

-------------------------
-- 4) Unified Search Material
-------------------------
-- Helper function to normalize text for search
create or replace function geo.norm_txt(txt text)
returns text language sql immutable as $$
  select coalesce(unaccent(lower(txt)),'')
$$;

-- Search vectors
alter table if not exists geo.provinces add column if not exists sv tsvector;
alter table if not exists geo.districts add column if not exists sv tsvector;
alter table if not exists geo.local_levels add column if not exists sv tsvector;
alter table if not exists geo.wards add column if not exists sv tsvector;
alter table if not exists geo.toles add column if not exists sv tsvector;
alter table if not exists geo.countries add column if not exists sv tsvector;
alter table if not exists geo.cities add column if not exists sv tsvector;

-- Update functions + triggers for each table (kept compact)
create or replace function geo.provinces_sv_trg() returns trigger language plpgsql as $$
begin
  new.sv := to_tsvector('simple', geo.norm_txt(new.name_en||' '||coalesce(new.name_ne,'')));
  return new;
end $$;

create or replace function geo.districts_sv_trg() returns trigger language plpgsql as $$
begin
  new.sv := to_tsvector('simple', geo.norm_txt(new.name_en||' '||coalesce(new.name_ne,'')));
  return new;
end $$;

create or replace function geo.local_levels_sv_trg() returns trigger language plpgsql as $$
begin
  new.sv := to_tsvector('simple', geo.norm_txt(
    new.name_en||' '||coalesce(new.name_ne,'')||' '||coalesce(new.ll_code,'')
  ));
  return new;
end $$;

create or replace function geo.wards_sv_trg() returns trigger language plpgsql as $$
declare ll record;
begin
  select name_en, name_ne into ll from geo.local_levels where id = new.local_level_id;
  new.sv := to_tsvector('simple', geo.norm_txt(
    coalesce('ward '||new.ward_no,'')||' '||coalesce(ll.name_en,'')||' '||coalesce(ll.name_ne,'')
  ));
  return new;
end $$;

create or replace function geo.toles_sv_trg() returns trigger language plpgsql as $$
begin
  new.sv := to_tsvector('simple', geo.norm_txt(new.name_en||' '||array_to_string(coalesce(new.alt_names,'{}'::text[]),' ')));
  return new;
end $$;

create or replace function geo.countries_sv_trg() returns trigger language plpgsql as $$
begin
  new.sv := to_tsvector('simple', geo.norm_txt(new.id||' '||new.name_en||' '||coalesce(new.name_native,'')));
  return new;
end $$;

create or replace function geo.cities_sv_trg() returns trigger language plpgsql as $$
begin
  new.sv := to_tsvector('simple', geo.norm_txt(
    new.name_en||' '||coalesce(new.admin1,'')
  ));
  return new;
end $$;

-- Attach triggers
do $$
begin
  if not exists (select 1 from pg_trigger where tgname='trg_provinces_sv') then
    create trigger trg_provinces_sv before insert or update on geo.provinces
      for each row execute function geo.provinces_sv_trg();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_districts_sv') then
    create trigger trg_districts_sv before insert or update on geo.districts
      for each row execute function geo.districts_sv_trg();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_local_levels_sv') then
    create trigger trg_local_levels_sv before insert or update on geo.local_levels
      for each row execute function geo.local_levels_sv_trg();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_wards_sv') then
    create trigger trg_wards_sv before insert or update on geo.wards
      for each row execute function geo.wards_sv_trg();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_toles_sv') then
    create trigger trg_toles_sv before insert or update on geo.toles
      for each row execute function geo.toles_sv_trg();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_countries_sv') then
    create trigger trg_countries_sv before insert or update on geo.countries
      for each row execute function geo.countries_sv_trg();
  end if;
  if not exists (select 1 from pg_trigger where tgname='trg_cities_sv') then
    create trigger trg_cities_sv before insert or update on geo.cities
      for each row execute function geo.cities_sv_trg();
  end if;
end $$;

-- Indexes for speed
create index if not exists idx_provinces_sv on geo.provinces using gin(sv);
create index if not exists idx_districts_sv on geo.districts using gin(sv);
create index if not exists idx_local_levels_sv on geo.local_levels using gin(sv);
create index if not exists idx_wards_sv on geo.wards using gin(sv);
create index if not exists idx_toles_sv on geo.toles using gin(sv);
create index if not exists idx_countries_sv on geo.countries using gin(sv);
create index if not exists idx_cities_sv on geo.cities using gin(sv);

-- Trigram for fuzzy typing ("kath", "ktm", etc.)
create index if not exists idx_local_levels_trgm on geo.local_levels using gin (geo.norm_txt(name_en) gin_trgm_ops);
create index if not exists idx_districts_trgm    on geo.districts    using gin (geo.norm_txt(name_en) gin_trgm_ops);
create index if not exists idx_cities_trgm       on geo.cities       using gin (geo.norm_txt(name_en) gin_trgm_ops);

-------------------------
-- 5) Friendly Picker View (flat labels for dropdown)
-------------------------
-- Example label:
--  "Ward 5 — Kathmandu Metropolitan City, Kathmandu, Bagmati"
create or replace view geo.vw_nepal_ward_picker as
select
  w.id                      as ward_id,
  w.local_level_id          as local_level_id,
  w.ward_no,
  ll.name_en                as local_level_name,
  ll.ll_type                as local_level_type,
  d.id                      as district_id,
  d.name_en                 as district_name,
  p.id                      as province_id,
  p.name_en                 as province_name,
  ('Ward '||w.ward_no||' — '||ll.name_en||', '||d.name_en||', '||p.name_en) as label
from geo.wards w
join geo.local_levels ll on ll.id = w.local_level_id
join geo.districts d on d.id = ll.district_id
join geo.provinces p on p.id = d.province_id
order by p.id, d.name_en, ll.name_en, w.ward_no;

-- Diaspora flat view: "City, State/Province (Country)"
create or replace view geo.vw_diaspora_city_picker as
select
  c.id            as city_id,
  c.name_en       as city_name,
  c.admin1,
  co.id           as country_code,
  co.name_en      as country_name,
  (c.name_en
    || coalesce(', '||c.admin1,'')
    || ' ('||co.name_en||')') as label
from geo.cities c
join geo.countries co on co.id = c.country_id
order by co.name_en, c.name_en;

-------------------------
-- 6) Unified Search Function
-------------------------
-- Returns both Nepal wards and Diaspora cities in one pipe:
-- type: 'ward' | 'city'; id; label; extras for client routing
create or replace function geo.search_locations(q text, k int default 20)
returns table (
  type text,
  id bigint,
  label text,
  province_id smallint,
  district_id smallint,
  local_level_id int,
  ward_no smallint,
  country_code text,
  city_id bigint
)
language sql stable as $$
  with
  qn as (select geo.norm_txt(q) as nq)
  -- Nepal wards
  , nepal as (
    select
      'ward'::text as type,
      w.id::bigint as id,
      ('Ward '||w.ward_no||' — '||ll.name_en||', '||d.name_en||', '||p.name_en) as label,
      p.id as province_id,
      d.id as district_id,
      ll.id as local_level_id,
      w.ward_no,
      null::text as country_code,
      null::bigint as city_id
    from geo.wards w
      join geo.local_levels ll on ll.id = w.local_level_id
      join geo.districts d on d.id = ll.district_id
      join geo.provinces p on p.id = d.province_id
    where
      -- quick fuzzy OR full-text match at LLG or district level
      geo.norm_txt(ll.name_en) % (select nq from qn)
      or ll.sv @@ plainto_tsquery('simple', (select nq from qn))
      or d.sv @@ plainto_tsquery('simple', (select nq from qn))
      or ('ward '||w.ward_no) ilike '%'||(select nq from qn)||'%'
    limit k
  )
  -- Diaspora cities
  , dias as (
    select
      'city'::text as type,
      c.id::bigint as id,
      (c.name_en||coalesce(', '||c.admin1,'')||' ('||co.name_en||')') as label,
      null::smallint as province_id,
      null::smallint as district_id,
      null::int as local_level_id,
      null::smallint as ward_no,
      co.id as country_code,
      c.id as city_id
    from geo.cities c
    join geo.countries co on co.id = c.country_id
    where
      geo.norm_txt(c.name_en) % (select nq from qn)
      or c.sv @@ plainto_tsquery('simple', (select nq from qn))
      or co.sv @@ plainto_tsquery('simple', (select nq from qn))
    limit k
  )
  select * from nepal
  union all
  select * from dias
  limit k;
$$;

-------------------------
-- 7) RLS (Read for everyone; writes service role only)
-------------------------
alter table geo.provinces enable row level security;
alter table geo.districts enable row level security;
alter table geo.local_levels enable row level security;
alter table geo.wards enable row level security;
alter table geo.toles enable row level security;
alter table geo.countries enable row level security;
alter table geo.cities enable row level security;

-- Public read:
create policy if not exists "public_read_provinces" on geo.provinces
  for select using (true);
create policy if not exists "public_read_districts" on geo.districts
  for select using (true);
create policy if not exists "public_read_local_levels" on geo.local_levels
  for select using (true);
create policy if not exists "public_read_wards" on geo.wards
  for select using (true);
create policy if not exists "public_read_toles" on geo.toles
  for select using (true);
create policy if not exists "public_read_countries" on geo.countries
  for select using (true);
create policy if not exists "public_read_cities" on geo.cities
  for select using (true);

-- Optional: service role write (e.g., admin ETL). Example (adjust role as needed):
-- grant usage on schema geo to service_role;
-- grant insert, update, delete on all tables in schema geo to service_role;

-------------------------
-- 8) Minimal Seed (kept tiny; replace with real ETL later)
-------------------------
-- Provinces (example subset)
insert into geo.provinces (id,name_en) values
  (3,'Bagmati')
on conflict (id) do nothing;

-- Districts (example subset)
insert into geo.districts (id,province_id,name_en) values
  (26,3,'Kathmandu')
on conflict (id) do nothing;

-- Local Level (example subset)
insert into geo.local_levels (id,district_id,ll_type,name_en) values
  (30601,26,'Metropolitan City','Kathmandu Metropolitan City')
on conflict (id) do nothing;

-- Wards (example subset)
insert into geo.wards (local_level_id,ward_no) values
  (30601,1),(30601,2),(30601,3),(30601,4),(30601,5)
on conflict do nothing;

-- Countries (example subset)
insert into geo.countries (id,name_en) values
  ('NP','Nepal'),('US','United States'),('GB','United Kingdom'),('AU','Australia'),('AE','United Arab Emirates')
on conflict (id) do nothing;

-- Cities (example subset)
insert into geo.cities (country_id,name_en,admin1) values
  ('NP','Kathmandu','Bagmati'),
  ('US','Boston','Massachusetts'),
  ('GB','London','England'),
  ('AE','Dubai',null)
on conflict do nothing;

-- Backfill SV for current rows
update geo.provinces set name_en=name_en;
update geo.districts set name_en=name_en;
update geo.local_levels set name_en=name_en;
update geo.wards set ward_no=ward_no;
update geo.toles set name_en=name_en;
update geo.countries set name_en=name_en;
update geo.cities set name_en=name_en;

-------------------------
-- 9) Ready-to-use: How your app consumes it
-------------------------
-- A) For a LOCAL resident dropdown (Nepal):
--    select ward_id, label from geo.vw_nepal_ward_picker limit 50;

-- B) For a DIASPORA toggle:
--    select city_id, label from geo.vw_diaspora_city_picker limit 50;

-- C) For a single search box (both worlds):
--    select * from geo.search_locations('kath', 20);
--
-- Client UX:
--   • Toggle: "I live abroad" → query vw_diaspora_city_picker
--   • Else → query vw_nepal_ward_picker
--   • Or use unified search function for typeahead
--
-- Notes:
--   • Replace the minimal seeds with your full ETL for 753 LLG + 6,743 wards.
--   • This schema is future-proof for adding Toles per ward (crowd or admin).
