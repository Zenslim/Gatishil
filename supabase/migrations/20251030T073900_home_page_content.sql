-- Create public.content table for homepage content management
create table if not exists public.content (
  slug text primary key,
  category text not null default 'page',
  title_en text,
  title_np text,
  body_en text,
  body_np text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure updated_at stays fresh on writes
create or replace function public.content_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_updated_at on public.content;

create trigger content_updated_at
before update on public.content
for each row
execute function public.content_set_updated_at();

-- Seed canonical homepage row when missing
insert into public.content (slug, category, title_en, body_en)
values (
  'home',
  'page',
  'Gatishil Nepal',
  '<p>Gatishil Nepal is the movement of the powerless, building a future where cooperation outpaces extraction.</p>'
)
on conflict (slug) do nothing;

-- Enable row level security
alter table public.content enable row level security;

do $$ begin
  create policy content_select_public on public.content
  for select
  using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy content_update_editors on public.content
  for update
  using (
    auth.uid() is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('editor', 'admin')
    )
  )
  with check (
    auth.uid() is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('editor', 'admin')
    )
  );
exception when duplicate_object then null; end $$;
