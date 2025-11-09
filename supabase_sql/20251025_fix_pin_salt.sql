
-- Safe migration: add salt_b64 and backfill from old salt BYTEA if it existed.
-- Run this in Supabase SQL editor.
begin;

alter table public.auth_local_pin
  add column if not exists salt_b64 text;

-- Backfill: if legacy `salt` BYTEA exists and salt_b64 is null, copy it as base64 string.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'auth_local_pin'
      and column_name = 'salt'
  ) then
    update public.auth_local_pin
       set salt_b64 = coalesce(salt_b64, encode(salt, 'base64'));
  end if;
end$$;

commit;
