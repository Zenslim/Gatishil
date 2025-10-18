-- Inspect current constraint (prints to results)
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.otps'::regclass;

-- Replace with canonical rule (exactly 13 digits: 977 + 10 starting with 9)
alter table public.otps drop constraint if exists otps_phone_check;
alter table public.otps add constraint otps_phone_check
  check ( phone ~ '^9779[0-9]{9}$' );

-- Purge legacy rows that would violate the new rule
delete from public.otps where phone !~ '^9779[0-9]{9}$';

-- Sanity proof in DB itself
select '977981234567' ~ '^9779[0-9]{9}$' as should_be_true,
       '97781234567'  ~ '^9779[0-9]{9}$' as should_be_false,
       '+977981234567' ~ '^9779[0-9]{9}$' as should_be_false;

-- Reload PostgREST cache
notify pgrst, 'reload schema';
