-- sql/otp_table.sql — Run once in Supabase SQL editor
-- Stores phone OTPs sent via AakashSMS. Codes expire in 5 minutes.
create table if not exists public.otps (
  id bigserial primary key,
  phone text not null,
  code text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  meta jsonb default '{}'
);

create index if not exists idx_otps_phone_created on public.otps (phone, created_at desc);

alter table public.otps enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='otps' and policyname='otps_server_rw') then
    create policy otps_server_rw on public.otps
      for all
      to authenticated, anon
      using (false)
      with check (false);
  end if;
end $$;
