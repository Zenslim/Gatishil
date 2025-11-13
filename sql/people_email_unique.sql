-- Optional: make emails unique to avoid duplicates when many join at once.
create unique index if not exists idx_people_email_unique on public.people (lower(email)) where email is not null;
