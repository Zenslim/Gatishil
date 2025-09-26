
-- WebAuthn storage
create table if not exists public.webauthn_credentials (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  public_key text not null,
  counter bigint not null default 0,
  device_type text,
  backed_up boolean,
  transports text[]
);

create table if not exists public.webauthn_challenges (
  id bigserial primary key,
  user_id uuid,
  challenge text not null,
  type text not null check (type in ('registration','authentication')),
  created_at timestamptz not null default now()
);

alter table public.webauthn_credentials enable row level security;
alter table public.webauthn_challenges  enable row level security;

create policy webauthn_srv_rw on public.webauthn_credentials
  for all using (false) with check (false);

create policy webauthn_srv_rw2 on public.webauthn_challenges
  for all using (false) with check (false);

create index if not exists idx_webauthn_credentials_user on public.webauthn_credentials(user_id);
