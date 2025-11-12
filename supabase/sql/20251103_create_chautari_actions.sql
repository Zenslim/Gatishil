-- Digital Chauṭarī base schema
-- Creates the `actions` table, sunlight feed view, realtime publication, and RLS policies.

create table if not exists public.actions (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  action_type text check (
    action_type in (
      'seed',
      'water',
      'hive',
      'fire',
      'whisper',
      'grain',
      'reflect',
      'miracle'
    )
  ) not null,
  description text,
  voice_url text,
  ward_id bigint,
  tole_id bigint,
  created_at timestamptz default timezone('utc', now()) not null
);

alter table public.actions enable row level security;

create policy if not exists "actions_select_public" on public.actions
  for select using (true);

create policy if not exists "actions_insert_auth" on public.actions
  for insert with check (auth.uid() = user_id);

create policy if not exists "actions_update_owner" on public.actions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "actions_delete_owner" on public.actions
  for delete using (auth.uid() = user_id);

-- realtime broadcast
alter publication supabase_realtime add table actions;

drop view if exists public.sunlight_feed;
create view public.sunlight_feed as
select id, action_type, user_id, created_at
from public.actions;

comment on table public.actions is 'Sunlight ledger entries representing civic actions on the Digital Chauṭarī.';
comment on view public.sunlight_feed is 'Public lightweight feed for streaming recent Chauṭarī actions.';
