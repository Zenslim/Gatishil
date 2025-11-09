-- 1) Drop legacy uniqueness and checks tied to (type, value)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'person_identities_type_value_key'
  ) then
    alter table public.person_identities
      drop constraint person_identities_type_value_key;
  end if;
exception when others then
  -- ignore if already gone
  null;
end$$;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'person_identities_type_check'
  ) then
    alter table public.person_identities
      drop constraint person_identities_type_check;
  end if;
exception when others then null;
end$$;

-- 2) Keep the modern check ONLY on identity_type (email, phone, govid)
--    (Recreate to be sure it's present & correct)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'person_identities_identity_type_chk'
  ) then
    alter table public.person_identities
      drop constraint person_identities_identity_type_chk;
  end if;
exception when others then null;
end$$;

alter table public.person_identities
  add constraint person_identities_identity_type_chk
  check (identity_type = any (array['email','phone','govid']));

-- 3) Remove legacy columns to prevent double-writes/drift
--    (Keep if they still hold non-null data; if so, migrate first below)
--    Migrate any legacy values into the modern columns before dropping.
with moved as (
  update public.person_identities
  set
    identity_type  = coalesce(identity_type, case when type in ('email','phone','gov_id') then replace(type,'gov_id','govid') end),
    identity_value = coalesce(identity_value, value),
    is_verified    = coalesce(is_verified, verified)
  where (identity_type is null and type is not null)
     or (identity_value is null and value is not null)
     or (is_verified is false and verified is true)
  returning *
)
select count(*) from moved;

-- Now safe to drop legacy columns if they exist
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='person_identities' and column_name='type'
  ) then
    alter table public.person_identities drop column type;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='person_identities' and column_name='value'
  ) then
    alter table public.person_identities drop column value;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='person_identities' and column_name='verified'
  ) then
    alter table public.person_identities drop column verified;
  end if;
exception when others then null;
end$$;

-- 4) Ensure the single canonical uniqueness on identities
--    (identity_type, identity_value) unique + partial uniques for email/phone
create unique index if not exists person_identity_unique_idx
  on public.person_identities (identity_type, identity_value);

create unique index if not exists uq_identity_email_value
  on public.person_identities (identity_value)
  where identity_type = 'email';

create unique index if not exists uq_identity_phone_value
  on public.person_identities (identity_value)
  where identity_type = 'phone';

-- 5) Keep the useful value index for lookups
create index if not exists idx_person_identities_value
  on public.person_identities (identity_value);

-- 6) Prune duplicate triggers; keep a single sync-to-profile trigger path
--    Remove any legacy mirror trigger that re-populates removed columns.
do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgname = 'trg_person_identities_legacy'
  ) then
    drop trigger trg_person_identities_legacy on public.person_identities;
  end if;
exception when others then null;
end$$;

-- Keep exactly one sync trigger that reacts to verified identity changes
-- First drop duplicates by name if present, then create a single one.
do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'on_identity_verify_sync') then
    drop trigger on_identity_verify_sync on public.person_identities;
  end if;
  if exists (select 1 from pg_trigger where tgname = 'trg_sync_verified_identity_into_profile') then
    drop trigger trg_sync_verified_identity_into_profile on public.person_identities;
  end if;
exception when others then null;
end$$;

create trigger trg_sync_verified_identity_into_profile
after insert or update of identity_value, is_verified, identity_type
on public.person_identities
for each row
execute function sync_verified_identity_into_profile();

-- 7) Ensure the passkey→profile sync trigger is present
-- (You already have this; keep it intact.)
-- create trigger trg_sync_profile_from_public_passkeys
-- after insert or delete or update on public.webauthn_credentials
-- for each row execute function tg_sync_profile_from_public_passkeys();

-- 8) Optional: backfill profiles.email/phone from verified identities (one shot)
with verified_email as (
  select person_id, identity_value as email
  from public.person_identities
  where identity_type='email' and is_verified
),
verified_phone as (
  select person_id, identity_value as phone
  from public.person_identities
  where identity_type='phone' and is_verified
)
update public.profiles p
set email = coalesce(p.email, ve.email),
    phone = coalesce(p.phone, vp.phone)
from verified_email ve
left join verified_phone vp using (person_id)
where p.person_id = ve.person_id or p.person_id = vp.person_id;
