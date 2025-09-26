-- 01_people_phone_unique.sql
-- Makes phone numbers unique if you adopt phone-first sign-in.
-- Safe to run multiple times.

do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='idx_people_phone_unique'
  ) then
    create unique index idx_people_phone_unique on public.people (phone) where phone is not null;
  end if;
end $$;