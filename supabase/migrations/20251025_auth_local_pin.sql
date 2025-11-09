-- Create table to hold PIN KDF metadata (no raw PIN)
create table if not exists public.auth_local_pin (
  user_id uuid primary key references auth.users(id) on delete cascade,
  salt bytea not null,
  kdf text not null default 'scrypt-v1',
  pin_retries int not null default 0,
  locked_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.auth_local_pin enable row level security;

-- Owner-only RLS: only the owner can see their row; writes go through service role
create policy "owner can select own pin meta"
on public.auth_local_pin
for select
to authenticated
using (auth.uid() = user_id);

-- (We do not allow client-side insert/update/delete; server uses service role.)
