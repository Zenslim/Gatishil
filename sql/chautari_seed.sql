-- Sample sunlight ledger entries for demos
-- Run after profiles exist; guarded to avoid FK failures when empty.

do $$
declare
  anchor uuid;
  newest uuid;
  second uuid;
  third uuid;
  fourth uuid;
begin
  select id into anchor from public.profiles order by created_at asc limit 1;
  if anchor is null then
    raise notice 'Skipping Digital Chauṭarī seed — no profiles found.';
    return;
  end if;

  select id into newest from public.profiles order by created_at desc limit 1;
  select id into second from (
    select id, row_number() over (order by created_at desc) as rn
    from public.profiles
  ) ranked where rn = 2;
  select id into third from (
    select id, row_number() over (order by created_at desc) as rn
    from public.profiles
  ) ranked where rn = 3;
  select id into fourth from (
    select id, row_number() over (order by created_at desc) as rn
    from public.profiles
  ) ranked where rn = 4;

  insert into public.actions (user_id, action_type, description, voice_url, ward_id, tole_id, created_at)
  values
    (coalesce(newest, anchor), 'seed', 'Community orchard proposal drafted with ward elders.', null, 11, 4, timezone('utc', now()) - interval '45 minutes'),
    (coalesce(second, anchor), 'water', 'Offered nursery time this weekend to tend new saplings.', null, 11, 4, timezone('utc', now()) - interval '38 minutes'),
    (coalesce(third, anchor), 'hive', 'Three households pledged tools for the cooperative workshop.', null, 12, 7, timezone('utc', now()) - interval '32 minutes'),
    (coalesce(fourth, anchor), 'fire', 'Verified the ward expense report and raised two clarifying questions.', null, 11, 4, timezone('utc', now()) - interval '27 minutes'),
    (coalesce(newest, anchor), 'whisper', 'Uploaded an elder''s 30 second blessing for the river cleanup.', 'https://example.org/audio/blessing.mp3', 9, 2, timezone('utc', now()) - interval '21 minutes'),
    (coalesce(second, anchor), 'grain', 'Delivered 20kg of millet to the communal kitchen.', null, 10, 6, timezone('utc', now()) - interval '16 minutes'),
    (coalesce(third, anchor), 'reflect', 'The circle felt gentler tonight—youths listened without interrupting.', null, 11, 4, timezone('utc', now()) - interval '9 minutes'),
    (coalesce(fourth, anchor), 'miracle', 'Ward 11 synced lights at 7pm; 142 participants joined the unity pulse.', null, 11, 4, timezone('utc', now()) - interval '2 minutes');
end $$;
