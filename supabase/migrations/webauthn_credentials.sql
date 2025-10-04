create table if not exists public.webauthn_credentials (
  user_id uuid not null references auth.users (id) on delete cascade,
  credential_id text primary key,
  public_key text not null,
  counter integer not null default 0,
  device_type text,
  backed_up boolean,
  transports text[],
  created_at timestamptz not null default now()
);

alter table public.webauthn_credentials enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where polname='webauthn_owner' and tablename='webauthn_credentials') then
    create policy webauthn_owner
    on public.webauthn_credentials
    for all
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end$$;
