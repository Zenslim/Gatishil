create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  author_name text,
  title text not null,
  slug text unique not null,
  excerpt text,
  content_mdx text,
  tags text[],
  status text default 'published',
  views int default 0,
  reactions int default 0,
  trust_score numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists posts_slug_idx on public.posts (slug);
create index if not exists posts_created_idx on public.posts (created_at desc);
