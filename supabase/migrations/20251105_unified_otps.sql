-- Ensure unified OTP storage for phone verification
create table if not exists public.otps (
  id bigserial primary key,
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  status text not null default 'sent',
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.otps
  alter column phone type text,
  alter column phone set not null,
  alter column code type text,
  alter column code set not null,
  alter column expires_at type timestamptz,
  alter column expires_at set not null,
  alter column status set default 'sent',
  alter column status set not null,
  alter column attempts set default 0,
  alter column attempts set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

alter table public.otps
  drop constraint if exists otps_code_length,
  drop constraint if exists otps_code_check,
  drop constraint if exists otps_phone_check;

alter table public.otps
  add constraint otps_code_length check (char_length(code) = 6),
  add constraint otps_phone_check check (phone ~ '^\+97798\d{8}$');

delete from public.otps where phone !~ '^\+97798\d{8}$';

create index if not exists idx_otps_phone_created on public.otps(phone, created_at desc);
