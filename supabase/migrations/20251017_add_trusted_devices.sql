-- supabase/migrations/20251017_add_trusted_devices.sql
-- Only if you haven’t created it yet; owner-only RLS.
create table if not exists public.profile_trusted_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  primary key (user_id, device_id)
);
alter table public.profile_trusted_devices enable row level security;
create policy owner_select on public.profile_trusted_devices for select using (auth.uid() = user_id);
create policy owner_insert on public.profile_trusted_devices for insert with check (auth.uid() = user_id);
create policy owner_update on public.profile_trusted_devices for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy owner_delete on public.profile_trusted_devices for delete using (auth.uid() = user_id);
