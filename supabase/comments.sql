create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  text text not null,
  trust_signature text,
  created_at timestamptz default now()
);

create index if not exists comments_post_idx on public.comments (post_id, created_at desc);
