-- supabase/sql/backfill_person_link.sql
-- One-time backfill to ensure every profile has a person record linked.
-- Run this in the Supabase SQL editor as 'postgres' (or with sufficient privileges).

-- 1) Create person for any user missing a link (idempotent if you use unique constraint).
insert into public.persons (id)
select gen_random_uuid()
from auth.users u
left join public.user_person_links upl on upl.user_id = u.id
where upl.user_id is null;

-- 2) Link user -> person where missing (example assumes a heuristic; adjust to your schema).
-- If you have a trigger that auto-creates persons on signup, you can skip this.
insert into public.user_person_links (user_id, person_id)
select p.user_id, p.person_id
from (
  select pr.user_id as user_id,
         (select id from public.persons order by created_at desc limit 1) as person_id
  from public.profiles pr
  left join public.user_person_links upl on upl.user_id = pr.user_id
  where upl.user_id is null
) p;

-- NOTE: Adjust above to match your actual schema constraints and creation logic.
