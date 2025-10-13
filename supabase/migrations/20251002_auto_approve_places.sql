-- 20251002_auto_approve_places.sql
-- Auto-approve user-added places; keep a weekly review list

-- 1) Ensure columns exist and default to 'approved'
alter table public.toles  add column if not exists status text default 'approved';
alter table public.cities add column if not exists status text default 'approved';

-- 2) Lightweight audit: who added what recently
create table if not exists public.place_audit (
  id bigserial primary key,
  kind text not null check (kind in ('tole','city')),
  place_id bigint not null,
  name text not null,
  meta jsonb default '{}',
  created_at timestamptz default now()
);

-- 3) Triggers to record new rows (optional but helpful)
create or replace function public.audit_tole_insert()
returns trigger language plpgsql as $$
begin
  insert into public.place_audit(kind, place_id, name, meta)
  values ('tole', new.id, new.name, jsonb_build_object('ward_id', new.ward_id));
  return new;
end $$;

drop trigger if exists trg_audit_tole_insert on public.toles;
create trigger trg_audit_tole_insert
after insert on public.toles
for each row execute function public.audit_tole_insert();

create or replace function public.audit_city_insert()
returns trigger language plpgsql as $$
begin
  insert into public.place_audit(kind, place_id, name, meta)
  values ('city', new.id, new.name, jsonb_build_object('country_code', new.country_code));
  return new;
end $$;

drop trigger if exists trg_audit_city_insert on public.cities;
create trigger trg_audit_city_insert
after insert on public.cities
for each row execute function public.audit_city_insert();

-- 4) Review view: everything added in the last 7 days
create or replace view public.recent_user_places as
select * from public.place_audit
where created_at >= now() - interval '7 days'
order by created_at desc;
